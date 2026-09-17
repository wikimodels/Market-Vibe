import { Injectable, inject } from '@angular/core';
// 🚀 ИСПРАВЛЕНИЕ: Пути (на 2 уровня вверх) для `core` и `models`

import { CoinData } from '../../models/coin-data.model';
// 🚀 ИСПРАВЛЕНИЕ: Путь к вашему интерфейсу (согласно coins.component.ts)
import { WorkingCoin } from '../../shared/models/working-coin.model';
import { KlineCacheService } from '../../shared/services/cache/kline-cache.service';
import { KlineDataService } from '../../shared/services/kline-data.service';
import { Candle, TF } from '../../models/kline.model';

/** Колонки таблицы изменения цены. '1d' маппится на TF 'D'. */
export type PriceChangeCol = '1h' | '4h' | '8h' | '12h' | '1d';

const COL_TF: Record<PriceChangeCol, TF> = {
  '1h': '1h',
  '4h': '4h',
  '8h': '8h',
  '12h': '12h',
  '1d': 'D',
};

export const PRICE_CHANGE_COLS: PriceChangeCol[] = ['1h', '4h', '8h', '12h', '1d'];

/**
 * Этот сервис отвечает за предоставление списка "рабочих" монет
 * (в формате WorkingCoin) для компонентов UI.
 */
@Injectable({
  providedIn: 'root',
})
export class CoinsService {
  // Внедряем существующие сервисы
  private klineDataService = inject(KlineDataService);
  private cache = inject(KlineCacheService);

  constructor() {
    console.log('✅ CoinsService initialized');
  }

  /**
   * Получает список монет, готовых для отображения в UI.
   *
   * Строгое правило свежести: сначала требуем СВЕЖИЕ klines через оркестратор.
   * Если свежих данных нет (null = протухшие/отсутствуют), возвращаем [],
   * а не трансформируем потенциально протухший мастер-список.
   */
  public async getWorkingCoins(): Promise<WorkingCoin[]> {
    try {
      // Шаг 1: Гарантируем свежесть данных. null = свежих нет, stale не отдаем.
      const fresh = await this.klineDataService.getKlines('1h');
      if (!fresh) {
        console.warn('⚠️ CoinsService: нет свежих klines 1h — WorkingCoins не отдаю.');
        return [];
      }

      // Шаг 2: Берем данные из IndexedDB.
      const masterCoinList = await this.cache.getCoinsData();

      // Шаг 3: Трансформируем CoinData[] в WorkingCoin[]
      //
      return this._transform(masterCoinList);
    } catch (error) {
      console.error('❌ CoinsService: Ошибка при получении WorkingCoins', error);
      return []; // Возвращаем пустой массив в случае ошибки
    }
  }

  /**
   * 🚀 ИЗМЕНЕНО: Приватный маппер обновлен
   * Трансформирует CoinData в WorkingCoin согласно вашим требованиям.
   */
  private _transform(coins: CoinData[]): WorkingCoin[] {
    if (!coins || coins.length === 0) {
      return [];
    }

    return coins.map((coin) => {
      // 1. Логика 'symbol' (1000FLOKI/USDT:USDT -> 1000FLOKI или BTCUSDT -> BTC)
      // --- 🚀 ИЗМЕНЕНИЕ: Улучшенная очистка 'symbol' ---
      const part0 = coin.symbol.split(':')[0]; // Убираем ':USDT'
      const part1 = part0.split('/')[0]; // Убираем '/USDT'

      let cleanSymbol = part1;
      // Убираем 'USDT' в конце (напр. BTCUSDT),
      // но не трогаем, если это сам 'USDT'
      if (cleanSymbol.endsWith('USDT') && cleanSymbol.length > 4) {
        cleanSymbol = cleanSymbol.slice(0, -4); // Удаляем 'USDT'
      }

      // 2. Логика 'logoUrl' (1000FLOKI -> 1000floki.svg)
      // --- 🚀 ИЗМЕНЕНИЕ: Убран путь, оставляем ТОЛЬКО ИМЯ ФАЙЛА ---
      const logoUrl = `${cleanSymbol.toLowerCase()}.svg`;

      // 3. Логика 'categoryStr' (1 -> "I")
      const categoryStr = this._mapCategoryToRoman(coin.category);

      return {
        symbol: cleanSymbol, // <-- ИЗМЕНЕНО
        exchanges: coin.exchanges,
        category: coin.category,
        categoryStr: categoryStr, // <-- ДОБАВЛЕНО
        logoUrl: logoUrl, // <-- ИЗМЕНЕНО
      };
    });
  }

  /**
   * Изменение цены (%) за окна 1h/4h/8h/12h/1d для всех монет из local DB.
   * Источник — KlineDataService (сначала IndexedDB, иначе API).
   * Ключ мапы — чистый symbol ('BTC'), значение null — нет данных.
   */
  public async getPriceChanges(
    cols: PriceChangeCol[] = PRICE_CHANGE_COLS
  ): Promise<Map<string, Record<PriceChangeCol, number | null>>> {

    const snapshots = await Promise.all(
      cols.map((col) => this.klineDataService.getKlines(COL_TF[col]).catch(() => null))
    );

    // symbol (clean, 'BTC') -> per-col change
    const result = new Map<string, Record<PriceChangeCol, number | null>>();

    const ensure = (symbol: string): Record<PriceChangeCol, number | null> => {
      let rec = result.get(symbol);
      if (!rec) {
        rec = { '1h': null, '4h': null, '8h': null, '12h': null, '1d': null };
        result.set(symbol, rec);
      }
      return rec;
    };

    snapshots.forEach((market, i) => {
      if (!market?.data) return;
      const col = cols[i];
      // base map: 'BTCUSDT' -> entry (strip trailing USDT like _transform does)
      const byBase = new Map<string, (typeof market.data)[number]>();
      for (const entry of market.data) {
        const norm = this._normalizeSymbol(entry.symbol);
        if (!norm) continue;
        byBase.set(norm, entry);
        if (norm.endsWith('USDT') && norm.length > 4) {
          byBase.set(norm.slice(0, -4), entry);
        }
      }
      // Для каждой известной чистой монеты ищем запись
      for (const [cleanSymbol] of result) {
        const entry = byBase.get(cleanSymbol);
        if (entry) {
          ensure(cleanSymbol)[col] = this._calcChange(entry.candles);
        }
      }
      // Монеты, встреченные только в маркет-данных: регистрируем под чистым именем
      for (const [key, entry] of byBase) {
        const clean = key.endsWith('USDT') && key.length > 4 ? key.slice(0, -4) : key;
        if (!result.has(clean)) {
          ensure(clean)[col] = this._calcChange(entry.candles);
        } else if (ensure(clean)[col] === null) {
          ensure(clean)[col] = this._calcChange(entry.candles);
        }
      }
    });

    return result;
  }

  /**
   * % изменения за последний интервал ТФ: берём две последние свечи серии
   * (close[-1] vs close[-2]) — данные из local DB (KlineDataService).
   */
  private _calcChange(candles: Candle[] | undefined): number | null {
    if (!candles || candles.length < 2) return null;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    if (!last || !prev || !(prev.closePrice > 0) || !(last.closePrice > 0)) return null;
    return ((last.closePrice - prev.closePrice) / prev.closePrice) * 100;
  }

  /** Нормализация как в enrichWithRealtimeCorrelation: 'BTC/USDT:USDT' -> 'BTCUSDT'. */
  private _normalizeSymbol(val: string): string {
    if (!val) return '';
    const base = val.split(':')[0];
    return base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * 🚀 ДОБАВЛЕНО: Хелпер для преобразования категории в римские цифры
   */
  private _mapCategoryToRoman(category: number): string {
    switch (category) {
      case 1:
        return 'I';
      case 2:
        return 'II';
      case 3:
        return 'III';
      case 4:
        return 'IV';
      case 5:
        return 'V';
      case 6:
        return 'VI';
      default:
        return 'N/A'; // Запасной вариант
    }
  }
}
