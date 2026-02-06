import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

import { SignalIntensityHeatmapService } from '../services/signal-intensity-heatmap.service';
import { KlineDataService } from '../../shared/services/kline-data.service';
import { CoinsDataService } from '../../shared/services/coin-data.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SignalIntensityTableComponent } from '../signal-intensity-table/signal-intensity-table.component';
import { MarketData, TF } from '../../models/kline.model';

@Component({
    selector: 'app-mobile-heatmap',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        LoadingSpinnerComponent,
        SignalIntensityTableComponent
    ],
    templateUrl: './mobile-heatmap.component.html',
    styleUrls: ['./mobile-heatmap.component.scss']
})
export class MobileHeatmapComponent implements OnInit {
    private klineService = inject(KlineDataService);
    private heatmapService = inject(SignalIntensityHeatmapService);
    private coinsService = inject(CoinsDataService);

    // State management
    public isLoading = signal<boolean>(true);
    public activeTab = signal<TF>('1h');
    public chartsData = signal<any>(null);
    public masterCoinsLoaded = signal<number>(0);

    // Data storage
    private allMarketData = new Map<string, MarketData>();
    private widgetCache: Record<string, any> = {};

    // Available timeframes
    public timeframes: TF[] = ['1h', '4h', '8h', '12h', 'D'];
    public selectedTabIndex = 0;

    async ngOnInit() {
        console.log('🔵 [Mobile Heatmap] Initializing...');
        this.isLoading.set(true);

        try {
            // 1. Load master coin list
            await this.coinsService.init();
            const coins = this.coinsService.getCurrentCoins();
            this.masterCoinsLoaded.set(coins.length);
            console.log(`✅ [Mobile Heatmap] Loaded ${coins.length} coins`);

            // 2. Load all timeframes (like desktop)
            await this.loadAllTimeframes();

            // 3. Select first tab
            this.selectTab('1h');
        } catch (error) {
            console.error('❌ [Mobile Heatmap] Initialization error:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    private async loadAllTimeframes() {
        console.log('🔄 [Mobile Heatmap] Loading all timeframes...');
        this.allMarketData.clear();
        this.widgetCache = {};

        try {
            // Load all timeframes in parallel (like desktop)
            const results = await Promise.all(
                this.timeframes.map(tf => this.klineService.getKlines(tf))
            );

            console.log('📊 [Mobile Heatmap] Results received:', results.map((r, i) => ({
                tf: this.timeframes[i],
                hasData: !!r,
                dataLength: r?.data?.length || 0,
                firstCoin: r?.data?.[0]?.symbol,
                candlesCount: r?.data?.[0]?.candles?.length || 0
            })));

            // Store market data
            results.forEach((data, index) => {
                const tf = this.timeframes[index];
                if (data && data.data && data.data.length > 0) {
                    this.allMarketData.set(tf, data);
                    console.log(`✅ [Mobile Heatmap] Added ${tf} to allMarketData, coins: ${data.data.length}`);
                } else {
                    console.warn(`⚠️ [Mobile Heatmap] Skipped ${tf} - no valid data`);
                }
            });

            // Process with heatmap service (like desktop)
            if (this.allMarketData.size > 0) {
                console.log('🔄 [Mobile Heatmap] Processing heatmap data with service...');
                const heatmapData = this.heatmapService.getWidgetData(this.allMarketData);

                console.log('📊 [Mobile Heatmap] Heatmap service returned:', {
                    timeframes: Object.keys(heatmapData),
                    firstTF: Object.keys(heatmapData)[0],
                    firstTFData: heatmapData[Object.keys(heatmapData)[0]]
                });

                // Store in cache
                this.timeframes.forEach(tf => {
                    if (heatmapData[tf]) {
                        this.widgetCache[tf] = heatmapData[tf];
                        console.log(`✅ [Mobile Heatmap] Cached data for ${tf}:`, {
                            signals: heatmapData[tf].signals?.length,
                            rawData: heatmapData[tf].rawData?.length,
                            yAxis: heatmapData[tf].yAxis?.length,
                            timestamps: heatmapData[tf].timestamps?.length
                        });
                    } else {
                        console.warn(`⚠️ [Mobile Heatmap] No heatmap data for ${tf}`);
                    }
                });

                console.log('✅ [Mobile Heatmap] Widget cache populated:', Object.keys(this.widgetCache));
            } else {
                console.error('❌ [Mobile Heatmap] No market data loaded!');
            }
        } catch (error) {
            console.error('❌ [Mobile Heatmap] Error loading timeframes:', error);
        }
    }

    public selectTab(tf: TF) {
        console.log(`🎯 [Mobile Heatmap] Selecting tab: ${tf}`);
        this.activeTab.set(tf);

        // Transform data for this timeframe
        const transformedData = this.getTableData(tf);
        this.chartsData.set(transformedData);
    }

    public onTabChange(index: number) {
        const tf = this.timeframes[index];
        this.selectTab(tf);
    }

    /**
     * Get table data with only 5 columns (newest to oldest)
     * Desktop shows 20 columns, mobile shows 5
     * 
     * SignalIntensityHeatmapService returns data with NEWEST candles FIRST (index 0)
     * So array looks like: [newest, newer, ..., older, oldest]
     * 
     * We want to show 5 NEWEST candles in descending order: [newest, ..., oldest of the 5]
     */
    public getTableData(tf: TF) {
        const fullData = this.widgetCache[tf];
        if (!fullData) {
            console.warn(`⚠️ [Mobile Heatmap] No data for ${tf}`);
            return null;
        }

        // Service returns 20 candles with newest first: [0=newest, 1, 2, ..., 18, 19=oldest]
        // We want 5 newest candles in descending order (newest → oldest)
        // Just take first 5 elements: [0=newest, 1, 2, 3, 4]

        const take5NewestDescending = (arr: any[]) => {
            if (arr.length <= 5) {
                // If less than 5 candles, return as-is (newest first)
                return [...arr];
            }
            // Take first 5 (newest candles) - no reverse needed
            return arr.slice(0, 5);
        };

        const result = {
            signals: fullData.signals,
            rawData: fullData.rawData.map((row: number[]) => take5NewestDescending(row)),
            normalizedData: fullData.normalizedData.map((row: number[]) => take5NewestDescending(row)),
            yAxis: fullData.yAxis,
            timestamps: take5NewestDescending(fullData.timestamps)
        };

        console.log(`📊 [Mobile Heatmap] DETAILED Table data for ${tf}:`, {
            signals: result.signals.length,
            columns: result.timestamps.length,
            timestamps: result.timestamps.map((ts: number) => new Date(ts).toISOString()),
            // Show first 5 rows with actual values
            row0: { signal: result.signals[0], yAxis: result.yAxis[0], values: result.rawData[0] },
            row1: { signal: result.signals[1], yAxis: result.yAxis[1], values: result.rawData[1] },
            row2: { signal: result.signals[2], yAxis: result.yAxis[2], values: result.rawData[2] },
            row3: { signal: result.signals[3], yAxis: result.yAxis[3], values: result.rawData[3] },
            row4: { signal: result.signals[4], yAxis: result.yAxis[4], values: result.rawData[4] },
            order: 'newest → oldest'
        });

        return result;
    }
}
