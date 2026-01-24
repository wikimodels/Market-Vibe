import { Injectable } from '@angular/core';
// 🚀 ИМПОРТ: Добавляем HttpParams
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// --- ИМПОРТ МОДЕЛЕЙ ---
// (Этот сервис знает только о моделях API-ответов)
import { TF, KlineApiResponse, KlineApiAllResponse } from '../../../models/kline.model';

// Экспортируем тип таймфрейма для использования в других компонентах
export type Timeframe = TF;

/**
 * ШАГ 1: API Сервис
 *
 * Отвечает ТОЛЬКО за получение "сырых" данных с сервера.
 * Не содержит никакой бизнес-логики или расчетов.
 */
@Injectable({
  providedIn: 'root',
})
export class KlineDataApiService {
  private klineUrls = environment.klineDataUrls;
  private token = environment.token;

  constructor(private http: HttpClient) {}

  /**
   * Получает "сырые" klines для одного таймфрейма.
   * (БЕЗ .pipe(map(...)) - это "сырой" ответ)
   */
  getKlines(timeframe: Timeframe): Observable<KlineApiResponse> {
    const url = this.klineUrls[timeframe];
    const headers = this.createAuthHeaders();

    // 🚀 ЛОГИКА: Добавляем параметры запроса
    let params = new HttpParams();

    // Если это 1-часовой таймфрейм, ставим лимит 600
    if (timeframe === '1h') {
      params = params.set('limit', '600');
    }
    // Для всех остальных таймфреймов limit не будет добавлен,
    // и сервер использует свой лимит по умолчанию (400)

    // 🚀 ИСПРАВЛЕНО: Добавляем { headers, params } в запрос
    return this.http.get<KlineApiResponse>(url, { headers, params });
  }

  /**
   * Получает "сырые" klines для ВСЕХ таймфреймов.
   * (БЕЗ .pipe(map(...)) - это "сырой" ответ)
   */
  getAllKlines(): Observable<KlineApiAllResponse> {
    const baseUrl = this.klineUrls['1h'].replace('/api/cache/1h', '');
    const url = `${baseUrl}/api/cache/all`;
    const headers = this.createAuthHeaders();

    // (Здесь лимит не нужен, так как это 'all')
    return this.http.get<KlineApiAllResponse>(url, { headers });
  }

  /**
   * Создает заголовки авторизации.
   */
  private createAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
    });
  }
}
