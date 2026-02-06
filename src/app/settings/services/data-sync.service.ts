import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { switchMap, map, catchError, delay, tap } from 'rxjs/operators';
import { environment, BUFFER_MS } from '../../../environments/environment';
import { TF, KlineApiResponse, MarketData } from '../../models/kline.model';
import { KlineCacheService } from '../../shared/services/cache/kline-cache.service';
import { CoinsDataService } from '../../shared/services/coin-data.service';

export interface StaleDataError {
  isStale: boolean;
  lagMs: number;
  lastOpenTime: number;
  serverTime: number;
}

import { IndicatorPipelineService } from '../../shared/services/pipeline/indicator-pipeline.service';

@Injectable({
  providedIn: 'root',
})
export class DataSyncService {
  private token = environment.token;
  private serverMap = environment.serverBaseUrls;

  private coinsService = inject(CoinsDataService);
  private cacheService = inject(KlineCacheService);
  private pipeline = inject(IndicatorPipelineService);

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
    });
  }

  public runSyncCycle(tf: TF): Observable<number> {
    const baseUrl = this.serverMap[tf];

    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    // API для JOB требует '1d'
    const jobTf = tf === 'D' ? '1d' : tf;
    const runUrl = `${baseUrl}/api/jobs/run/${jobTf}`;

    // API для CACHE требует 'D' (согласно environment.ts и валидации сервера)
    // Поэтому для URL кэша используем оригинальный TF (где 'D' это 'D')
    const cacheTf = tf;
    const cacheUrl = `${baseUrl}/api/cache/${cacheTf}`;
    // --------------------------

    console.log(`🚀 [DataSync] Starting job for ${tf} (Job: ${jobTf}, Cache: ${cacheTf})`);

    return this.http
      .post<{ success: boolean; message: string }>(runUrl, {}, { headers: this.getAuthHeaders() })
      .pipe(
        tap((res) => console.log(`cw [DataSync] Job triggered:`, res)),

        delay(180000), // Ждем 3 минуты

        switchMap(() => {
          console.log(`cw [DataSync] Checking server cache at ${cacheUrl}...`);
          return this.http.get<KlineApiResponse>(cacheUrl, { headers: this.getAuthHeaders() });
        }),

        switchMap((response) => {
          if (response && response.success && response.data && Array.isArray(response.data.data)) {
            const marketData = response.data;
            const count = marketData.data.length;

            // 1. Проверяем на потери
            this.checkForMissingCoins(marketData.data, tf);

            // 2. Проверяем на свежесть
            const staleCheck = this.checkStaleStatus(marketData, tf);
            if (staleCheck.isStale) {
              console.warn(`⚠️ [DataSync] Data for ${tf} is STALE! Lag: ${staleCheck.lagMs}ms`);
              throw staleCheck;
            }

            // 3. Прогоняем через Pipeline (расчет индикаторов)
            return from(this.pipeline.process(marketData)).pipe(
              switchMap((processedData) => {
                // 4. Сохраняем в базу уже обогащенные данные
                return from(this.cacheService.saveMarketData(processedData)).pipe(map(() => count));
              })
            );
          }
          return throwError(() => new Error('Invalid cache response or empty data'));
        }),

        catchError((err) => {
          console.error(`❌ [DataSync] Cycle failed for ${tf}`, err);
          return throwError(() => err);
        })
      );
  }

  private checkForMissingCoins(incomingData: any[], tf: TF) {
    const allCoins = this.coinsService.getCurrentCoins();
    if (!allCoins || allCoins.length === 0) return;

    const incomingSymbols = new Set(incomingData.map((d) => d.symbol));
    const missingCoins = allCoins.filter((c) => !incomingSymbols.has(c.symbol));

    if (missingCoins.length > 0) {
      console.group(`🚨 [DataSync] LOSS DETECTED for ${tf}`);
      console.warn(`Expected: ${allCoins.length}, Received: ${incomingData.length}`);
      console.warn(
        `Missing ${missingCoins.length} coins:`,
        missingCoins.map((c) => c.symbol)
      );
      console.groupEnd();
    } else {
      console.log(`✅ [DataSync] All ${allCoins.length} coins received successfully for ${tf}.`);
    }
  }

  private checkStaleStatus(data: MarketData, timeframe: TF): StaleDataError {
    try {
      if (!data?.data?.length) {
        return { isStale: true, lagMs: 0, lastOpenTime: 0, serverTime: Date.now() };
      }

      const timeframeMs = this.parseTimeframeToMs(timeframe);
      let maxLastOpenTime = 0;
      for (const coin of data.data) {
        if (!coin.candles?.length) continue;
        const last = coin.candles[coin.candles.length - 1];
        if (last.openTime > maxLastOpenTime) maxLastOpenTime = last.openTime;
      }

      const currentTime = Date.now();
      const expectedMinTime = currentTime - (2 * timeframeMs + BUFFER_MS);
      const isStale = maxLastOpenTime < expectedMinTime;

      const idealCloseTime = maxLastOpenTime + timeframeMs;
      const lagMs = Math.max(0, currentTime - idealCloseTime);

      return { isStale, lagMs, lastOpenTime: maxLastOpenTime, serverTime: currentTime };
    } catch (e) {
      console.error('Error checking stale status', e);
      return { isStale: true, lagMs: 0, lastOpenTime: 0, serverTime: Date.now() };
    }
  }

  private parseTimeframeToMs(timeframe: TF): number {
    const H = 3600000;
    if (timeframe === '1h') return H;
    if (timeframe === '4h') return 4 * H;
    if (timeframe === '8h') return 8 * H;
    if (timeframe === '12h') return 12 * H;
    if (timeframe === 'D' || timeframe === '1d') return 24 * H;
    return 0;
  }
}
