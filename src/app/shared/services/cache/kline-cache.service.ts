import { Injectable } from '@angular/core';
import { KlineDB, CoinsDataWrapper } from './kline-db';
import { CoinData } from '../../../models/coin-data.model';
import { TF, MarketData } from '../../../models/kline.model';
import { getFreshnessInfo, isMarketDataExpired } from './kline-freshness';

// Статический ключ для хранения единого мастер-списка монет
const COIN_DATA_KEY = 'MASTER_COIN_LIST';

@Injectable({
  providedIn: 'root',
})
export class KlineCacheService {
  private db: KlineDB;

  constructor() {
    this.db = new KlineDB();
    console.log('✅ KlineCacheService initialized');
  }

  // ========================================
  // --- MarketData (Свечи и Индикаторы) ---
  // ========================================

  /**
   * Получает MarketData для указанного таймфрейма из IndexedDB.
   *
   * ⚠️ СЫРОЙ доступ без проверки свежести. Только для внутренних нужд
   * (синхронизация в /settings, статистика). UI-компоненты НЕ должны
   * использовать его напрямую — только через KlineDataService.getKlines()
   * или getFreshMarketData() ниже.
   *
   * @param timeframe Таймфрейм ('1h', '4h', и т.д.)
   * @returns MarketData или null, если не найдено.
   */
  public async getMarketData(timeframe: TF): Promise<MarketData | null> {
    try {
      // .get() - это асинхронный метод Dexie
      const data = await this.db.marketData.get(timeframe);
      if (data) {
        console.log(`✅ Cache: Взят MarketData [${timeframe}] из IndexedDB`);
        return data;
      }
      return null;
    } catch (error) {
      console.error(`❌ Cache: Ошибка получения MarketData [${timeframe}]`, error);
      return null;
    }
  }

  /**
   * Сохраняет (или перезаписывает) MarketData в IndexedDB.
   * Ключ 'timeframe' берется прямо из объекта.
   * @param data Объект MarketData для сохранения.
   */
  public async saveMarketData(data: MarketData): Promise<void> {
    try {
      // .put() - "умный" метод: добавляет, если нет, или обновляет, если есть.
      await this.db.marketData.put(data);
      console.log(`✅ Cache: Сохранен MarketData [${data.timeframe}] в IndexedDB`);
    } catch (error) {
      console.error(`❌ Cache: Ошибка сохранения MarketData [${data.timeframe}]`, error);
    }
  }

  /**
   * Удаляет MarketData для указанного таймфрейма из IndexedDB.
   * @param timeframe Таймфрейм для удаления ('1h', '4h', '8h', и т.д.)
   */
  public async deleteMarketData(timeframe: TF): Promise<void> {
    try {
      await this.db.marketData.delete(timeframe);
      console.warn(`🗑️ Cache: Удален MarketData [${timeframe}] из IndexedDB`);
    } catch (error) {
      console.error(`❌ Cache: Ошибка удаления MarketData [${timeframe}]`, error);
    }
  }

  /**
   * ЕДИНСТВЕННЫЙ разрешенный путь чтения свечей из IndexedDB для UI.
   *
   * Возвращает данные ТОЛЬКО если они свежие (проверка через
   * kline-freshness.ts). Протухшие/пустые данные приравниваются к
   * отсутствующим: метод возвращает null и удаляет протухшую запись,
   * чтобы она никого больше не отравила.
   *
   * @param timeframe Таймфрейм ('1h', '4h', и т.д.)
   * @returns Свежий MarketData или null.
   */
  public async getFreshMarketData(timeframe: TF): Promise<MarketData | null> {
    const data = await this.getMarketData(timeframe);
    if (!data) return null;
    if (isMarketDataExpired(data, timeframe)) {
      console.warn(`⚠️ Cache: MarketData [${timeframe}] протух, отдавать нельзя — удаляю.`, getFreshnessInfo(data, timeframe));
      try {
        await this.db.marketData.delete(timeframe);
      } catch (error) {
        console.error(`❌ Cache: Ошибка удаления протухшего MarketData [${timeframe}]`, error);
      }
      return null;
    }
    return data;
  }

  // ========================================
  // --- CoinData (Мастер-список) ---
  // ========================================

  /**
   * Получает мастер-список CoinData из IndexedDB.
   * @returns Массив CoinData[] или пустой массив.
   */
  public async getCoinsData(): Promise<CoinData[]> {
    try {
      const wrapper = await this.db.coinsData.get(COIN_DATA_KEY);
      if (wrapper && wrapper.coins && Array.isArray(wrapper.coins)) {
        console.log(`✅ Cache: Взят мастер-список [${wrapper.coins.length} монет] из IndexedDB`);
        return wrapper.coins;
      }
      return [];
    } catch (error) {
      console.error('❌ Cache: Ошибка получения мастер-списка', error);
      return [];
    }
  }

  /**
   * Сохраняет (перезаписывает) мастер-список CoinData в IndexedDB.
   * @param coinsData Массив CoinData для сохранения.
   */
  public async saveCoinsData(coinsData: CoinData[]): Promise<void> {
    try {
      if (!Array.isArray(coinsData)) {
        console.error('❌ Cache: Попытка сохранить не-массив в CoinData');
        return;
      }
      // Оборачиваем массив в объект-wrapper, чтобы сохранить его по ключу
      const wrapper: CoinsDataWrapper = {
        id: COIN_DATA_KEY,
        coins: coinsData,
      };
      await this.db.coinsData.put(wrapper);
      console.log(`✅ Cache: Сохранен мастер-список [${coinsData.length} монет] в IndexedDB`);
    } catch (error) {
      console.error('❌ Cache: Ошибка сохранения мастер-списка', error);
    }
  }

  /**
   * Удаляет мастер-список монет из IndexedDB.
   */
  public async clearCoinsData(): Promise<void> {
    try {
      await this.db.coinsData.delete(COIN_DATA_KEY);
      console.warn('🗑️ Cache: Удален мастер-список монет из IndexedDB');
    } catch (error) {
      console.error('❌ Cache: Ошибка удаления мастер-списка', error);
    }
  }

  // ========================================
  // --- Утилиты (По вашему запросу) ---
  // ========================================

  /**
   * Полностью очищает все таблицы в KlineCacheDB
   * (Для возможности "начать заново")
   */
  public async clearAllData(): Promise<void> {
    try {
      // Promise.all для параллельной очистки
      await Promise.all([this.db.marketData.clear(), this.db.coinsData.clear()]);
      console.warn('⚠️ Cache: Вся база данных KlineCacheDB очищена.');
    } catch (error) {
      console.error('❌ Cache: Ошибка при полной очистке базы', error);
    }
  }

  /**
   * Возвращает статистику: сколько монет в мастер-списке и по каждому таймфрейму.
   */
  public async getStorageStats(): Promise<{ coins: number; timeframes: Record<string, number> }> {
    const stats = {
      coins: 0,
      timeframes: {} as Record<string, number>,
    };

    try {
      // 1. Считаем мастер-список
      // Используем хардкод ключ или константу COIN_DATA_KEY, если она доступна внутри класса
      const coinsWrapper = await this.db.coinsData.get('MASTER_COIN_LIST');
      if (coinsWrapper && coinsWrapper.coins) {
        stats.coins = coinsWrapper.coins.length;
      }

      // 2. Проходимся по всем TF в базе
      const allTfData = await this.db.marketData.toArray();

      allTfData.forEach((row) => {
        if (row.data && Array.isArray(row.data)) {
          stats.timeframes[row.timeframe] = row.data.length;
        }
      });
    } catch (e) {
      console.error('Error calculating storage stats', e);
    }

    return stats;
  }
}
