import { Injectable, inject } from '@angular/core';
import { Candle } from '../../models/kline.model';
import { ChartCandle } from '../models/chart-candle.model';
import { KlineDataService } from './kline-data.service';
import { UTCTimestamp } from 'lightweight-charts';

// 🚀 ДОБАВЛЕН ИНТЕРФЕЙС, описывающий, что мы ВОЗВРАЩАЕМ
export interface ChartDataResponse {
  chartFormattedData: ChartCandle[];
  exchanges: string[];
  category: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  // 1. Внедряем ваш главный "Оркестратор"
  private klineDataService = inject(KlineDataService);

  constructor() {
    console.log('✅ ChartDataService initialized');
  }
  /**
   * Получает и форматирует данные 1H-графика для указанного "чистого" символа.
   * @param symbol "Чистый" символ монеты (напр. "BTC", "1000FLOKI")
   */

  // 🚀 ИСПРАВЛЕН ТИП ВОЗВРАТА: Promise<ChartDataResponse | null>
  public async getChartData(symbol: string): Promise<ChartDataResponse | null> {
    try {
      // 2. Получаем 1H данные из "Оркестратора"
      const marketData = await this.klineDataService.getKlines('1h');

      if (!marketData || !marketData.data) {
        console.warn(`[ChartDataService] MarketData (1h) не найдена.`);
        // 🚀 ИСПРАВЛЕН ТИП ВОЗВРАТА (в случае ошибки)
        return null;
      } // 3. Находим данные по конкретной монете

      const coinData = marketData.data.find((c) => this.cleanSymbol(c.symbol) === symbol);

      if (!coinData || !coinData.candles) {
        console.warn(`[ChartDataService] Данные для ${symbol} (1h) не найдены.`);
        // 🚀 ИСПРАВЛЕН ТИП ВОЗВРАТА (в случае ошибки)
        return null;
      } // 4. ❗️ ГЛАВНАЯ КОНВЕРТАЦИЯ (без изменений)

      const chartFormattedData = coinData.candles.map((candle: Candle) => ({
        time: (candle.openTime / 1000) as UTCTimestamp,
        open: candle.openPrice,
        high: candle.highPrice,
        low: candle.lowPrice,
        close: candle.closePrice,
        volume: candle.volume,
      }));

      console.log(
        `[ChartDataService] ${symbol}: Загружено ${chartFormattedData.length} свечей (1h).`
      );

      // 🚀 (Этот return теперь соответствует типу ChartDataResponse)
      return { chartFormattedData, exchanges: coinData.exchanges, category: coinData.category };
    } catch (error) {
      console.error(`[ChartDataService] Ошибка при получении данных для ${symbol}`, error);
      // 🚀 ИСПРАВЛЕН ТИП ВОЗВРАТА (в случае ошибки)
      return null;
    }
  }
  /**
   * Вспомогательный метод очистки символа.
   * (Логика, которую я видел в ваших других файлах)
   */

  private cleanSymbol(symbol: string): string {
    // "BTC/USDT:USDT" -> "BTC"
    // "BTCUSDT" -> "BTC"
    const part0 = symbol.split(':')[0]; // Убираем ':USDT'
    const part1 = part0.split('/')[0]; // Убираем '/USDT'

    let cleanSymbol = part1; // Убираем 'USDT' в конце (напр. BTCUSDT)
    if (cleanSymbol.endsWith('USDT') && cleanSymbol.length > 4) {
      cleanSymbol = cleanSymbol.slice(0, -4); // Удаляем 'USDT'
    }
    return cleanSymbol;
  }
}
