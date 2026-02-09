import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TF } from '../../models/kline.model';

export type DataSource = 'render' | 'ngrok';

export interface DataSourceConfig {
    type: DataSource;
    baseUrls: Record<TF, string>;
    displayName: string;
    description: string;
}

const STORAGE_KEY = 'market-vibe-data-source';

@Injectable({
    providedIn: 'root',
})
export class DataSourceService {
    private currentSource$ = new BehaviorSubject<DataSource>(this.loadSavedSource());

    constructor() {
        // Initialize with saved or default source
        const source = this.loadSavedSource();
        this.currentSource$.next(source);
    }

    /**
     * Get current data source as observable
     */
    public getSource$(): Observable<DataSource> {
        return this.currentSource$.asObservable();
    }

    /**
     * Get current data source value
     */
    public getCurrentSource(): DataSource {
        return this.currentSource$.value;
    }

    /**
     * Switch to a different data source
     */
    public setSource(source: DataSource): void {
        if (source !== this.currentSource$.value) {
            this.currentSource$.next(source);
            this.saveSource(source);
            console.log(`📡 [DataSource] Switched to: ${source.toUpperCase()}`);
        }
    }

    /**
     * Get configuration for current source
     */
    public getCurrentConfig(): DataSourceConfig {
        return this.getConfigForSource(this.currentSource$.value);
    }

    /**
     * Get configuration for a specific source
     */
    public getConfigForSource(source: DataSource): DataSourceConfig {
        if (source === 'ngrok') {
            return {
                type: 'ngrok',
                baseUrls: {
                    '1h': environment.ngrokBaseUrl,
                    '4h': environment.ngrokBaseUrl,
                    '8h': environment.ngrokBaseUrl,
                    '12h': environment.ngrokBaseUrl,
                    D: environment.ngrokBaseUrl,
                },
                displayName: 'Ngrok Unified',
                description: 'Single endpoint for all timeframes',
            };
        } else {
            return {
                type: 'render',
                baseUrls: environment.serverBaseUrls as Record<TF, string>,
                displayName: 'Render Servers',
                description: 'Bazzar (1h, 12h, D) + Bizzar (4h, 8h)',
            };
        }
    }

    /**
     * Get the API URL for a specific timeframe based on current source
     */
    public getKlineUrl(timeframe: TF): string {
        const source = this.currentSource$.value;

        if (source === 'ngrok') {
            // Ngrok uses unified endpoint with timeframe parameter
            const tfParam = timeframe === 'D' ? 'D' : timeframe;
            return `${environment.ngrokBaseUrl}/api/cache/${tfParam}`;
        } else {
            // Render servers use different base URLs per timeframe
            const baseUrl = environment.serverBaseUrls[timeframe];
            const tfParam = timeframe === 'D' ? 'D' : timeframe;
            return `${baseUrl}/api/cache/${tfParam}`;
        }
    }

    /**
     * Get the job trigger URL for a specific timeframe (Render only)
     */
    public getJobUrl(timeframe: TF): string | null {
        const source = this.currentSource$.value;

        if (source === 'ngrok') {
            // Ngrok doesn't need job triggering - data is always fresh
            return null;
        } else {
            // Render servers need job triggering
            const baseUrl = environment.serverBaseUrls[timeframe];
            const jobTf = timeframe === 'D' ? '1d' : timeframe;
            return `${baseUrl}/api/jobs/run/${jobTf}`;
        }
    }

    /**
     * Check if current source requires job triggering
     */
    public requiresJobTrigger(): boolean {
        return this.currentSource$.value === 'render';
    }

    /**
     * Load saved source from localStorage
     */
    private loadSavedSource(): DataSource {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'render' || saved === 'ngrok') {
                return saved;
            }
        } catch (e) {
            console.warn('[DataSource] Failed to load saved source', e);
        }
        return environment.defaultDataSource;
    }

    /**
     * Save source to localStorage
     */
    private saveSource(source: DataSource): void {
        try {
            localStorage.setItem(STORAGE_KEY, source);
        } catch (e) {
            console.error('[DataSource] Failed to save source', e);
        }
    }
}
