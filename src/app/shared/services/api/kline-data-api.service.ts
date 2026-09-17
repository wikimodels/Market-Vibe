import { Injectable, inject } from '@angular/core';
// 🚀 ИМПОРТ: Добавляем HttpParams
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// --- ИМПОРТ МОДЕЛЕЙ ---
// (Этот сервис знает только о моделях API-ответов)
import { TF, KlineApiResponse, KlineApiAllResponse } from '../../../models/kline.model';
import { DataSourceService } from '../data-source.service';

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
  private token = environment.token;
  private dataSourceService = inject(DataSourceService);

  constructor(private http: HttpClient) { }

  /**
   * Получает "сырые" klines для одного таймфрейма.
   * (БЕЗ .pipe(map(...)) - это "сырой" ответ)
   */
  getKlines(timeframe: Timeframe): Observable<KlineApiResponse> {
    // Mapping for mismatch '1d' vs 'D'
    const tfKey = (timeframe as string) === '1d' ? 'D' : timeframe;
    // Use DataSourceService to get the URL dynamically
    const url = this.dataSourceService.getKlineUrl(tfKey as TF);

    if (!url) {
      console.error(`❌ [API] URL not found for timeframe: ${timeframe} (key: ${tfKey})`);
    }

    const headers = this.createAuthHeaders();

    // 🚀 ЛОГИКА: Добавляем параметры запроса
    let params = new HttpParams();

    // 1h / 4h / 1d (D) — 600 свечей, остальные — дефолт сервера 400
    if (timeframe === '1h' || timeframe === '4h' || timeframe === 'D' || (timeframe as string) === '1d') {
      params = params.set('limit', '600');
    }

    // 🚀 ИСПРАВЛЕНО: Добавляем { headers, params } в запрос
    return this.http.get<KlineApiResponse>(url, { headers, params });
  }

  /**
   * Получает "сырые" klines для ВСЕХ таймфреймов.
   * (БЕЗ .pipe(map(...)) - это "сырой" ответ)
   */
  getAllKlines(): Observable<KlineApiAllResponse> {
    const url1h = this.dataSourceService.getKlineUrl('1h');
    const baseUrl = url1h.replace('/api/cache/1h', '');
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
      'ngrok-skip-browser-warning': 'true', // Add this to support ngrok
    });
  }
}
