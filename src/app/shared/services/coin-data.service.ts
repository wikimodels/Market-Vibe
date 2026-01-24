import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { CoinData } from '../../models/coin-data.model';
import { CoinsApiService } from './api/coins-api.service';
import { KlineCacheService } from './cache/kline-cache.service';

@Injectable({
  providedIn: 'root',
})
export class CoinsDataService {
  private coinsSubject = new BehaviorSubject<CoinData[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public coins$ = this.coinsSubject.asObservable();
  public isLoading$ = this.loadingSubject.asObservable();

  private isInitialized = false;

  constructor(private apiService: CoinsApiService, private cacheService: KlineCacheService) {}

  /**
   * Логика: Кеш -> Если пусто, то Сервер.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.loadingSubject.next(true);

    try {
      // 1. Пробуем достать из базы
      const cachedCoins = await this.cacheService.getCoinsData();

      // 2. Если нашли данные — используем их и ВЫХОДИМ
      if (cachedCoins && cachedCoins.length > 0) {
        console.log(
          `⚡ CoinsDataService: Найдено в кеше ${cachedCoins.length} монет. Сеть не запрашиваем.`
        );
        this.coinsSubject.next(cachedCoins);
        this.loadingSubject.next(false); // Останавливаем индикатор загрузки
        return; // <--- ВАЖНО: Прерываем выполнение, в сеть не идем
      }
    } catch (err) {
      console.error('⚠️ CoinsDataService: Ошибка чтения кеша, пробуем загрузить с сервера...', err);
    }

    // 3. Если мы здесь — значит кеш пуст (или ошибка). Идем на сервер.
    console.log('🌐 CoinsDataService: Кеш пуст. Запрашиваем данные с сервера...');
    this.refreshData();
  }

  /**
   * Запрос данных с сервера.
   * Используется либо если кеш пуст, либо для ручного обновления (кнопка "Обновить").
   */
  public refreshData(): void {
    this.loadingSubject.next(true);

    this.apiService
      .fetchCoinDataList()
      .pipe(
        tap(async (freshCoins) => {
          if (freshCoins && freshCoins.length > 0) {
            console.log(`📥 CoinsDataService: Загружено с сервера ${freshCoins.length} монет.`);

            // Обновляем состояние
            this.coinsSubject.next(freshCoins);

            // Сохраняем в кеш на будущее
            await this.cacheService.saveCoinsData(freshCoins);
          }
        }),
        catchError((err) => {
          console.error('❌ CoinsDataService: Ошибка сети', err);
          return [];
        }),
        finalize(() => {
          this.loadingSubject.next(false);
        })
      )
      .subscribe();
  }

  // Вспомогательные методы
  public getCurrentCoins(): CoinData[] {
    return this.coinsSubject.getValue();
  }

  public getCoinBySymbol(symbol: string): CoinData | undefined {
    return this.coinsSubject.getValue().find((c) => c.symbol === symbol);
  }
}
