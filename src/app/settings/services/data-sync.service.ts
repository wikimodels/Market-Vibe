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

export interface SyncProgress {
  status: 'connecting' | 'running' | 'processing' | 'completed' | 'error';
  ticks: number;
  resultCount?: number;
  error?: string;
}

import { IndicatorPipelineService } from '../../shared/services/pipeline/indicator-pipeline.service';
import { DataSourceService } from '../../shared/services/data-source.service';

@Injectable({
  providedIn: 'root',
})
export class DataSyncService {
  private token = environment.token;
  private serverMap = environment.serverBaseUrls;

  private coinsService = inject(CoinsDataService);
  private cacheService = inject(KlineCacheService);
  private pipeline = inject(IndicatorPipelineService);
  private dataSourceService = inject(DataSourceService);

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'ngrok-skip-browser-warning': 'true', // Bypass ngrok warning page
    });
  }

  public runSyncCycle(tf: TF): Observable<SyncProgress> {
    const currentSource = this.dataSourceService.getCurrentSource();
    console.log(`🚀 [DataSync] Starting sync for ${tf} using ${currentSource.toUpperCase()} source`);

    if (currentSource === 'ngrok') {
      // Ngrok: Direct fetch, no job triggering needed
      return this.fetchAndProcessData(tf);
    } else {
      // Render: Trigger job, wait, then fetch
      return this.triggerJobAndFetch(tf);
    }
  }

  /**
   * Ngrok flow: Direct data fetch (data is always fresh)
   */
  private fetchAndProcessData(tf: TF): Observable<SyncProgress> {
    const cacheUrl = this.dataSourceService.getKlineUrl(tf);
    console.log(`📥 [DataSync] Fetching from ${cacheUrl}...`);

    return this.http.get<KlineApiResponse>(cacheUrl, { headers: this.getAuthHeaders() }).pipe(
      switchMap((response) => this.processResponse(response, tf)),
      map((count) => ({ status: 'completed' as const, ticks: 0, resultCount: count })),
      catchError((err) => {
        console.error(`❌ [DataSync] Fetch failed for ${tf}`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Render flow: Trigger job, stream progress ticks, then fetch
   */
  private triggerJobAndFetch(tf: TF): Observable<SyncProgress> {
    return new Observable<SyncProgress>((subscriber) => {
      subscriber.next({ status: 'connecting', ticks: 0 });

      const jobUrl = this.dataSourceService.getJobUrl(tf);
      const cacheUrl = this.dataSourceService.getKlineUrl(tf);

      if (!jobUrl) {
        subscriber.error(new Error('Job URL not available for current source'));
        return;
      }

      console.log(`🔨 [DataSync] Triggering job stream at ${jobUrl}...`);
      const controller = new AbortController();

      fetch(jobUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        signal: controller.signal
      })
      .then(async (response) => {
        if (!response.body) {
          throw new Error('ReadableStream not supported by browser');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let ticksCount = 0;
        let completeResponseStr = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          completeResponseStr += chunk;

          const newDots = (chunk.match(/\./g) || []).length;
          if (newDots > 0) {
            ticksCount += newDots;
            subscriber.next({ status: 'running', ticks: ticksCount });
          }
        }

        // Stream closed
        let finalData;
        try {
          finalData = JSON.parse(completeResponseStr);
        } catch (e) {
          // If response isn't pure JSON, we ignore the parse error, as streaming might produce artifacts
        }

        if (finalData && finalData.success === false) {
          throw new Error(finalData.error || 'Server responded with success: false');
        }

        subscriber.next({ status: 'processing', ticks: ticksCount });
        console.log(`📥 [DataSync] Stream finished. Checking cache at ${cacheUrl}...`);

        this.http.get<KlineApiResponse>(cacheUrl, { headers: this.getAuthHeaders() }).pipe(
          switchMap((res) => this.processResponse(res, tf))
        ).subscribe({
          next: (count) => {
            subscriber.next({ status: 'completed', ticks: ticksCount, resultCount: count });
            subscriber.complete();
          },
          error: (err) => subscriber.error(err)
        });

      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          subscriber.error(error);
        }
      });

      return () => {
        controller.abort();
      };
    });
  }

  /**
   * Common processing logic for both sources
   */
  private processResponse(response: KlineApiResponse, tf: TF): Observable<number> {
    if (response && response.success && response.data && Array.isArray(response.data.data)) {
      const marketData = response.data;
      const count = marketData.data.length;

      // 1. Check for missing coins
      this.checkForMissingCoins(marketData.data, tf);

      // 2. Check for stale data
      const staleCheck = this.checkStaleStatus(marketData, tf);
      if (staleCheck.isStale) {
        console.warn(`⚠️ [DataSync] Data for ${tf} is STALE! Lag: ${staleCheck.lagMs}ms`);
        throw staleCheck;
      }

      // 3. Process through pipeline (calculate indicators)
      return from(this.pipeline.process(marketData)).pipe(
        switchMap((processedData) => {
          // 4. Save enriched data to IndexedDB
          return from(this.cacheService.saveMarketData(processedData)).pipe(map(() => count));
        })
      );
    }
    return throwError(() => new Error('Invalid cache response or empty data'));
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
