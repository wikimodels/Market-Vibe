import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// --- ИМПОРТЫ ---
import { KlineDataApiService } from './api/kline-data-api.service';
import { IndicatorPipelineService } from './pipeline/indicator-pipeline.service';
import { TF, MarketData } from '../../models/kline.model';
import { KlineCacheService } from './cache/kline-cache.service';
import { NotificationService } from './notification.service';
import { CoinsDataService } from './coin-data.service'; // 🔥 Сервис монет
import { DataSourceService } from './data-source.service';
import {
  getFreshnessInfo,
  isMarketDataExpired,
} from './cache/kline-freshness';

export type Timeframe = TF;

@Injectable({
  providedIn: 'root',
})
export class KlineDataService {
  private api = inject(KlineDataApiService);
  private pipeline = inject(IndicatorPipelineService);
  private cache = inject(KlineCacheService);
  private notification = inject(NotificationService);
  private coinsService = inject(CoinsDataService); // Для получения корреляции
  private dataSourceService = inject(DataSourceService);

  public isLoading$ = new BehaviorSubject<boolean>(false);
  private memoryCache = new Map<Timeframe, MarketData>();
  /** Защита от параллельных одинаковых запросов: один TF — один полет. */
  private inflight = new Map<Timeframe, Promise<MarketData | null>>();

  constructor() {
    // Смена источника данных делает весь RAM-кэш недействительным:
    // URL другие => данные чужие. Чистим сразу, не дожидаясь протухания.
    this.dataSourceService.getSource$().subscribe(() => {
      if (this.memoryCache.size > 0 || this.inflight.size > 0) {
        console.warn('🔄 [Оркестратор] Смена источника данных — чищу RAM-кэш.');
        this.memoryCache.clear();
        this.inflight.clear();
      }
    });
  }

  /**
   * ОРКЕСТРАТОР: отдает ТОЛЬКО свежие данные.
   *
   * Каждый вызов ОБЯЗАТЕЛЬНО проверяет свежесть:
   * 1. RAM — с проверкой срока (протухшее удаляется, дальше не идет).
   * 2. IndexedDB — только через getFreshMarketData() (протухшее удаляется).
   * 3. API — ответ валидируется ДО сохранения; протухший ответ сервера
   *    не сохраняется и не возвращается (null вместо протухших данных).
   */
  public async getKlines(tf: Timeframe): Promise<MarketData | null> {
    console.log(`🔵 [Оркестратор] START getKlines for ${tf}`);

    // 1. Проверка RAM — ОБЯЗАТЕЛЬНО со сроком годности
    const ramData = this.memoryCache.get(tf);
    if (ramData) {
      if (isMarketDataExpired(ramData, tf)) {
        console.warn(`⚠️ [Оркестратор] ${tf}: RAM-кэш ПРОТУХ — удаляю, дальше не отдаю.`, getFreshnessInfo(ramData, tf));
        this.memoryCache.delete(tf);
      } else {
        console.log(`💾 [Оркестратор] ${tf}: свежий RAM-кэш, монет: ${ramData.data.length}`);
        this.enrichWithRealtimeCorrelation(ramData);
        return ramData;
      }
    }

    // 2. Проверка IndexedDB — только свежие (протухшие getFreshMarketData удаляет сам)
    try {
      const cachedData = await this.cache.getFreshMarketData(tf);
      if (cachedData) {
        console.log(`✅ [Оркестратор] ${tf}: свежие данные из IDB, монет: ${cachedData.data.length}.`);
        this.memoryCache.set(tf, cachedData);
        this.enrichWithRealtimeCorrelation(cachedData);
        return cachedData;
      }
      console.log(`🌐 [Оркестратор] ${tf}: свежих данных в кэше нет, качаю с API...`);
    } catch (e) {
      console.error(`❌ [Оркестратор] ${tf}: Error reading cache:`, e);
    }

    // 3. API — с дедупликацией параллельных запросов
    let dataToReturn = await this.fetchFromApiDeduped(tf);

    // 🔥 ЭТАП ОБОГАЩЕНИЯ
    if (dataToReturn) {
      this.enrichWithRealtimeCorrelation(dataToReturn);
      console.log(`✅ [Оркестратор] ${tf}: Final data ready, coins: ${dataToReturn.data.length}`);
    } else {
      console.error(`❌ [Оркестратор] ${tf}: NO FRESH DATA after all attempts (протухшее не отдаем)`);
    }

    console.log(
      `🔵 [Оркестратор] END getKlines for ${tf}:`,
      dataToReturn?.data[0]?.candles[dataToReturn?.data[0]?.candles.length - 1]
    );
    return dataToReturn;
  }

  /** Один TF — один полет: параллельные вызовы делят один запрос. */
  private fetchFromApiDeduped(tf: Timeframe): Promise<MarketData | null> {
    const running = this.inflight.get(tf);
    if (running) {
      console.log(`⏳ [Оркестратор] ${tf}: запрос уже летит — жду его вместо нового.`);
      return running;
    }
    const job = this.fetchFromApi(tf).finally(() => {
      if (this.inflight.get(tf) === job) this.inflight.delete(tf);
    });
    this.inflight.set(tf, job);
    return job;
  }

  private async fetchFromApi(tf: Timeframe): Promise<MarketData | null> {
    console.log(`[Оркестратор] ${tf}: Запрос к API...`);
    this.isLoading$.next(true);

    try {
      const response = (await firstValueFrom(this.api.getKlines(tf))) as any;

      if (response && response.success) {
        // ⛔ Валидация свежести ОТВЕТА СЕРВЕРА до сохранения и отдачи.
        // Протухший ответ не пишем в кэши и не возвращаем — только свежие.
        if (isMarketDataExpired(response.data, tf)) {
          console.error(`⛔ [Оркестратор] ${tf}: сервер отдал ПРОТУХШИЕ данные — не сохраняю, не отдаю.`, getFreshnessInfo(response.data, tf));
          this.memoryCache.delete(tf);
          this.notification.show(
            `Server data for ${tf} is stale — refresh it in Settings`,
            'error' as any,
          );
          return null;
        }

        const processedData = await this.pipeline.process(response.data);

        // Пайплайн не должен оживлять протухшее: финальная проверка перед записью.
        if (isMarketDataExpired(processedData, tf)) {
          console.error(`⛔ [Оркестратор] ${tf}: данные протухли после обработки — не сохраняю.`);
          this.memoryCache.delete(tf);
          return null;
        }

        await this.cache.saveMarketData(processedData);
        this.memoryCache.set(tf, processedData);

        return processedData;
      }
    } catch (error) {
      console.error(`[Оркестратор] Ошибка API ${tf}:`, error);
      this.notification.show('Error loading market data', 'error' as any);
    } finally {
      this.isLoading$.next(false);
    }
    return null;
  }

  /**
   * Принудительно перезагружает данные для указанного таймфрейма.
   * Удаляет из кеша (RAM + IndexedDB) и загружает свежие данные с API.
   * @param tf Таймфрейм для перезагрузки
   */
  public async forceReloadTimeframe(tf: Timeframe): Promise<MarketData | null> {
    console.warn(`🔄 [ForceReload] Принудительная перезагрузка ${tf}...`);

    // 1. Очистка памяти + сброс висящего запроса, чтобы не подсунул старое
    this.memoryCache.delete(tf);
    this.inflight.delete(tf);

    // 2. Очистка IndexedDB
    await this.cache.deleteMarketData(tf);

    // 3. Загрузка с API (с полным пайплайном индикаторов и проверкой свежести)
    const freshData = await this.fetchFromApi(tf);

    if (freshData) {
      // 4. Обогащение корреляцией
      this.enrichWithRealtimeCorrelation(freshData);
      console.log(`✅ [ForceReload] ${tf} успешно перезагружен с ${freshData.data.length} монетами`);
    } else {
      console.error(`❌ [ForceReload] Не удалось перезагрузить ${tf}`);
    }

    return freshData;
  }

  /**
   * 🔥 ЖЕСТКАЯ НОРМАЛИЗАЦИЯ И ПРИСВОЕНИЕ
   * Превращает "BTC/USDT:USDT" -> "BTCUSDT" и матчит.
   */
  private enrichWithRealtimeCorrelation(data: MarketData) {
    const allCoins = this.coinsService.getCurrentCoins();

    if (!allCoins || allCoins.length === 0) {
      // Список монет может еще грузиться, это не критично, но данные не обновятся прямо сейчас
      return;
    }

    // --- ФУНКЦИЯ ЧИСТКИ (BTC - оставь только это) ---
    const normalize = (val: string) => {
      if (!val) return '';
      // 1. Убираем всё после двоеточия (если есть провайдер ликвидности)
      const base = val.split(':')[0];
      // 2. Вырезаем слэши, тире и прочий мусор. Оставляем только буквы и цифры.
      return base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    };

    // Создаем карту для быстрого поиска: "BTCUSDT" -> CoinData
    const coinMap = new Map<string, any>();

    allCoins.forEach((c) => {
      // Ключ 1: Оригинал (на всякий случай)
      coinMap.set(c.symbol, c);

      // Ключ 2: Чистый (BTC/USDT:USDT -> BTCUSDT)
      const cleanKey = normalize(c.symbol);
      if (cleanKey) coinMap.set(cleanKey, c);

      // Ключ 3: Full Symbol, если есть
      if (c.full_symbol) {
        const cleanFull = normalize(c.full_symbol);
        if (cleanFull) coinMap.set(cleanFull, c);
      }
    });

    let updatedCount = 0;

    for (const coinMarketData of data.data) {
      // Нормализуем символ свечи (обычно он уже чистый, но для гарантии)
      const targetSymbol = normalize(coinMarketData.symbol);

      const coinInfo = coinMap.get(targetSymbol);

      if (coinInfo) {
        // Записываем значение. Если null/undefined -> ставим 0
        coinMarketData.btc_corr_1d_w30 = coinInfo.btc_corr_1d_w30 ?? 0;
        updatedCount++;
      }
    }

    // Лог результата
    console.log(
      `[Enricher] ${data.timeframe}: Updated correlation for ${updatedCount} coins (Total: ${data.data.length}).`
    );
  }
}
