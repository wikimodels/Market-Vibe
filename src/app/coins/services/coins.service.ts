import { Injectable, inject } from '@angular/core';
// 🚀 ИСПРАВЛЕНИЕ: Пути (на 2 уровня вверх) для `core` и `models`

import { CoinData } from '../../models/coin-data.model';
// 🚀 ИСПРАВЛЕНИЕ: Путь к вашему интерфейсу (согласно coins.component.ts)
import { WorkingCoin } from '../../shared/models/working-coin.model';
import { KlineCacheService } from '../../shared/services/cache/kline-cache.service';
import { KlineDataService } from '../../shared/services/kline-data.service';

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
   */
  public async getWorkingCoins(): Promise<WorkingCoin[]> {
    try {
      // Шаг 1: Гарантируем свежесть данных (по вашему требованию).
      await this.klineDataService.getKlines('1h');

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
