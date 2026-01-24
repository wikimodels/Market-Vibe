import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators'; // <-- Добавлен retry
// (Путь к environment скорректирован)
import { environment } from '../../../../environments/environment';
import { CoinData, CoinDataResponse } from '../../../models/coin-data.model';
// (Путь к моделям скорректирован)

/**
 * Сервис для API CoinSifter
 * (Бывший ExchangeApiService, переименован)
 * Отвечает за получение мастер-списка монет.
 */
@Injectable({
  providedIn: 'root',
})
export class CoinsApiService {
  private coinsUrl = environment.coinsUrl; // <-- Используем новое имя
  private token = environment.token; // (Это теперь X-API-Key)

  constructor(private http: HttpClient) {}

  /**
   * Создает заголовки авторизации.
   * (ИЗМЕНЕНО: Используем X-Auth-Token)
   */
  private createAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Auth-Token': this.token, // <-- ✅ ИСПРАВЛЕНО (было X-API-Key)
    });
  }

  /**
   * Загружает мастер-список монет с вашего сервера CoinSifter.
   */
  fetchCoinDataList(): Observable<CoinData[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<CoinDataResponse>(this.coinsUrl, { headers }).pipe(
      map((response) => response.data || []), // Возвращаем массив data или пустой
      retry(2), // <-- Добавлено (как в старом коде)
      catchError((error) => {
        console.error('❌ CoinsApiService: Ошибка загрузки списка монет:', error); // <-- Обновлен лог
        return of([]); // В случае ошибки возвращаем пустой массив
      })
    );
  }
}
