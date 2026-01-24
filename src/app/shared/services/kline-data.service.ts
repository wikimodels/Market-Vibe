import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// --- ИМПОРТЫ ---
import { KlineDataApiService } from './api/kline-data-api.service';
import { IndicatorPipelineService } from './pipeline/indicator-pipeline.service';
import { TF, MarketData } from '../../models/kline.model';
import { KlineCacheService } from './cache/kline-cache.service';
import { NotificationService } from './notification.service';
import { CoinsDataService } from './coin-data.service'; // 🔥 Сервис монет
import { BUFFER_MS } from '../../../environments/environment';

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

  public isLoading$ = new BehaviorSubject<boolean>(false);
  private memoryCache = new Map<Timeframe, MarketData>();

  /**
   * ОРКЕСТРАТОР: Получает данные и ГАРАНТИРОВАННО обогащает их корреляцией
   */
  public async getKlines(tf: Timeframe): Promise<MarketData | null> {
    let dataToReturn: MarketData | null = null;

    // 1. Проверка RAM
    if (this.memoryCache.has(tf)) {
      dataToReturn = this.memoryCache.get(tf)!;
    }
    // 2. Проверка IndexedDB
    else {
      try {
        const cachedData = await this.cache.getMarketData(tf);
        const isFresh = cachedData ? !this.isDataExpired(cachedData, tf) : false;

        if (cachedData && isFresh) {
          console.log(`[Оркестратор] ${tf}: Взят из IDB.`);
          this.memoryCache.set(tf, cachedData);
          dataToReturn = cachedData;
        }
      } catch (e) {
        console.warn('Ошибка чтения кэша:', e);
      }
    }

    // 3. Если пусто - качаем с API
    if (!dataToReturn) {
      dataToReturn = await this.fetchFromApi(tf);
    }

    // 🔥 ЭТАП ОБОГАЩЕНИЯ:
    // Даже если данные из старого кэша, мы ПРИНУДИТЕЛЬНО обновляем корреляцию
    if (dataToReturn) {
      this.enrichWithRealtimeCorrelation(dataToReturn);
    }

    console.log(
      '[Оркестратор]:',
      tf,
      dataToReturn?.data[0]?.candles[dataToReturn?.data[0]?.candles.length - 1]
    );
    return dataToReturn;
  }

  private async fetchFromApi(tf: Timeframe): Promise<MarketData | null> {
    console.log(`[Оркестратор] ${tf}: Запрос к API...`);
    this.isLoading$.next(true);

    try {
      const response = (await firstValueFrom(this.api.getKlines(tf))) as any;

      if (response && response.success) {
        const processedData = await this.pipeline.process(response.data);

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

  // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

  private isDataExpired(data: MarketData, timeframe: Timeframe): boolean {
    try {
      if (!data || !data.data || data.data.length === 0) return true;

      const timeframeMs = this.parseTimeframeToMs(timeframe);
      if (timeframeMs === 0) return false;

      // Ищем самую свежую свечу
      let maxLastOpenTime = 0;
      for (const coin of data.data) {
        if (!coin.candles || coin.candles.length === 0) continue;
        const lastCandle = coin.candles[coin.candles.length - 1];
        if (lastCandle.openTime > maxLastOpenTime) {
          maxLastOpenTime = lastCandle.openTime;
        }
      }

      if (maxLastOpenTime === 0) return true;

      const currentTime = Date.now();
      const expiryTime = maxLastOpenTime + 2 * timeframeMs + BUFFER_MS;

      return currentTime > expiryTime;
    } catch (e) {
      return true;
    }
  }

  private parseTimeframeToMs(timeframe: Timeframe): number {
    const ONE_HOUR = 60 * 60 * 1000;
    const tfStr = String(timeframe);
    if (tfStr === '1h') return ONE_HOUR;
    if (tfStr === '4h') return 4 * ONE_HOUR;
    if (tfStr === '8h') return 8 * ONE_HOUR;
    if (tfStr === '12h') return 12 * ONE_HOUR;
    if (tfStr === 'D' || tfStr === '1d') return 24 * ONE_HOUR;
    return 0;
  }
}
