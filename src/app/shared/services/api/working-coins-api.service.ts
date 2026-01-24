import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { WorkingCoin } from '../../models/working-coin.model';
import { NotificationService } from '../notification.service';

/**
 * API Response типы
 */
interface CoinsApiResponse {
  success: boolean;
  count: number;
  data: WorkingCoin[];
}

interface CoinActionResponse {
  success: boolean;
  symbol?: string;
  count?: number;
  deletedCount?: number;
}

/**
 * Кастомный класс ошибки для API операций
 */
export class CoinsApiError extends Error {
  constructor(message: string, public statusCode?: number, public originalError?: any) {
    super(message);
    this.name = 'CoinsApiError';
  }
}

/**
 * Сервис для работы с Working Coins API
 * Использует environment.workingCoinsUrl для всех запросов
 */
@Injectable({
  providedIn: 'root',
})
export class WorkingCoinsApiService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  // Базовый URL из environment (уже содержит /api/coins/working)
  private readonly baseUrl = environment.workingCoinsUrl;

  // ============================================
  // 🛠️ Приватные утилиты для обработки ошибок
  // ============================================

  /**
   * Обработчик HTTP ошибок с уведомлениями
   */
  private handleError(operation: string, showNotification = true) {
    return (error: HttpErrorResponse): Observable<never> => {
      let errorMessage = '';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Ошибка: ${error.error.message}`;
      } else {
        switch (error.status) {
          case 0:
            errorMessage = 'Нет соединения с сервером';
            break;
          case 400:
            errorMessage = error.error?.message || 'Некорректный запрос';
            break;
          case 404:
            errorMessage = 'Ресурс не найден';
            break;
          case 409:
            errorMessage = error.error?.message || 'Конфликт данных';
            break;
          case 500:
            errorMessage = 'Внутренняя ошибка сервера';
            break;
          default:
            errorMessage = `Ошибка ${error.status}: ${error.error?.message || error.message}`;
        }
      }

      const fullMessage = `${operation} - ${errorMessage}`;
      console.error(`[WorkingCoinsApiService] ${fullMessage}`, error);

      if (showNotification) {
        this.notificationService.error(fullMessage);
      }

      return throwError(() => new CoinsApiError(fullMessage, error.status, error));
    };
  }

  /**
   * Обёртка для безопасного выполнения async операций
   */
  private async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    showNotification = true
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage =
        error instanceof CoinsApiError ? error.message : `${operationName} - Неизвестная ошибка`;

      console.error(`[WorkingCoinsApiService] ${errorMessage}`, error);

      if (showNotification && !(error instanceof CoinsApiError)) {
        this.notificationService.error(errorMessage);
      }

      throw error;
    }
  }

  // ============================================
  // 📥 GET - Получение монет
  // ============================================

  /**
   * GET /api/coins/working
   * Получить все монеты
   */
  public getAllCoins(): Observable<CoinsApiResponse> {
    return this.http
      .get<CoinsApiResponse>(this.baseUrl)
      .pipe(catchError(this.handleError('Получение списка монет')));
  }

  /**
   * GET /api/coins/working (Promise вариант)
   */
  public async getAllCoinsAsync(): Promise<WorkingCoin[]> {
    return this.safeExecute(async () => {
      const response = await firstValueFrom(this.getAllCoins());
      return response.data;
    }, 'Получение списка монет');
  }

  // ============================================
  // ➕ POST - Добавление монет
  // ============================================

  /**
   * POST /api/coins/working
   * Добавить одну монету
   */
  public addCoin(coin: WorkingCoin): Observable<CoinActionResponse> {
    return this.http.post<CoinActionResponse>(this.baseUrl, coin).pipe(
      tap(() => this.notificationService.success(`Монета ${coin.symbol} успешно добавлена`)),
      catchError(this.handleError('Добавление монеты'))
    );
  }

  /**
   * POST /api/coins/working (Promise вариант)
   */
  public async addCoinAsync(coin: WorkingCoin): Promise<boolean> {
    return this.safeExecute(async () => {
      const response = await firstValueFrom(this.addCoin(coin));
      return response.success;
    }, 'Добавление монеты');
  }

  /**
   * POST /api/coins/working/batch
   * Добавить несколько монет (пакетом)
   */
  public addCoinsBatch(coins: WorkingCoin[]): Observable<CoinActionResponse> {
    return this.http.post<CoinActionResponse>(`${this.baseUrl}/batch`, coins).pipe(
      tap((response) =>
        this.notificationService.success(`Добавлено монет: ${response.count || 0}`)
      ),
      catchError(this.handleError('Пакетное добавление монет'))
    );
  }

  /**
   * POST /api/coins/working/batch (Promise вариант)
   */
  public async addCoinsBatchAsync(coins: WorkingCoin[]): Promise<number> {
    return this.safeExecute(async () => {
      const response = await firstValueFrom(this.addCoinsBatch(coins));
      return response.count || 0;
    }, 'Пакетное добавление монет');
  }

  // ============================================
  // ❌ DELETE - Удаление монет
  // ============================================

  /**
   * DELETE /api/coins/working/:symbol
   * Удалить одну монету по символу
   */
  public deleteCoin(symbol: string): Observable<CoinActionResponse> {
    return this.http.delete<CoinActionResponse>(`${this.baseUrl}/${symbol}`).pipe(
      tap(() => this.notificationService.success(`Монета ${symbol} удалена`)),
      catchError(this.handleError('Удаление монеты'))
    );
  }

  /**
   * DELETE /api/coins/working/:symbol (Promise вариант)
   */
  public async deleteCoinAsync(symbol: string): Promise<boolean> {
    return this.safeExecute(async () => {
      const response = await firstValueFrom(this.deleteCoin(symbol));
      return response.success;
    }, 'Удаление монеты');
  }

  /**
   * POST /api/coins/working/delete-batch
   * Удалить несколько монет по массиву символов
   */
  public deleteCoinsBatch(symbols: string[]): Observable<CoinActionResponse> {
    return this.http.post<CoinActionResponse>(`${this.baseUrl}/delete-batch`, symbols).pipe(
      tap((response) =>
        this.notificationService.success(`Удалено монет: ${response.deletedCount || 0}`)
      ),
      catchError(this.handleError('Пакетное удаление монет'))
    );
  }

  /**
   * POST /api/coins/working/delete-batch (Promise вариант)
   */
  public async deleteCoinsBatchAsync(symbols: string[]): Promise<number> {
    return this.safeExecute(async () => {
      const response = await firstValueFrom(this.deleteCoinsBatch(symbols));
      return response.deletedCount || 0;
    }, 'Пакетное удаление монет');
  }

  /**
   * DELETE /api/coins/working/all
   * ПОЛНОСТЬЮ ОЧИСТИТЬ все монеты
   */
  public deleteAllCoins(): Observable<CoinActionResponse> {
    return this.http.delete<CoinActionResponse>(`${this.baseUrl}/all`).pipe(
      tap((response) =>
        this.notificationService.warning(`Все монеты удалены (${response.deletedCount || 0})`)
      ),
      catchError(this.handleError('Удаление всех монет'))
    );
  }

  /**
   * DELETE /api/coins/working/all (Promise вариант)
   */
  public async deleteAllCoinsAsync(): Promise<number> {
    return this.safeExecute(async () => {
      const response = await firstValueFrom(this.deleteAllCoins());
      return response.deletedCount || 0;
    }, 'Удаление всех монет');
  }

  // ============================================
  // 🛠️ Вспомогательные методы
  // ============================================

  /**
   * Проверить, существует ли монета по символу
   */
  public async coinExists(symbol: string): Promise<boolean> {
    return this.safeExecute(
      async () => {
        const coins = await this.getAllCoinsAsync();
        return coins.some((coin) => coin.symbol === symbol);
      },
      'Проверка существования монеты',
      false
    );
  }

  /**
   * Получить монету по символу
   */
  public async getCoinBySymbol(symbol: string): Promise<WorkingCoin | null> {
    return this.safeExecute(
      async () => {
        const coins = await this.getAllCoinsAsync();
        const coin = coins.find((coin) => coin.symbol === symbol) || null;

        if (!coin) {
          this.notificationService.warning(`Монета ${symbol} не найдена`);
        }

        return coin;
      },
      'Поиск монеты по символу',
      false
    );
  }

  /**
   * Получить монеты по категории
   */
  public async getCoinsByCategory(category: number): Promise<WorkingCoin[]> {
    return this.safeExecute(
      async () => {
        const coins = await this.getAllCoinsAsync();
        return coins.filter((coin) => coin.category === category);
      },
      'Получение монет по категории',
      false
    );
  }

  /**
   * Получить количество монет
   */
  public async getCoinsCount(): Promise<number> {
    return this.safeExecute(
      async () => {
        const response = await firstValueFrom(this.getAllCoins());
        return response.count;
      },
      'Получение количества монет',
      false
    );
  }
}
