import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CoinsDataService } from '../shared/services/coin-data.service';
import { KlineDataService, Timeframe } from '../shared/services/kline-data.service';

// --- 1. Базовые сервисы ---
import { MarketRegimeService } from './services/market-regime.service';
import { MarketCompositeService } from './services/market-composite.service';
import { PatternRadarService } from './services/pattern-radar.service';
import { ExtremumBreakoutService } from './services/extremum-breakout.service';

// --- 2. EMA Сервисы ---
import { EmaRegimeService } from './services/ema-regime.service';
import { EmaCrossesService } from './services/ema-crosses.service';
import { EmaFanService } from './services/ema-fan.service';
import { EmaFanSlopeService } from './services/ema-fan-slope.service';

// 🔥 НОВЫЕ СТРАТЕГИИ ТРЕНДА
import { TrendRolloverService } from './services/trend-rollover.service';
import { BreakingIceService } from './services/breaking-ice.service';
import { BtcImpulseCorrelationService } from './services/btc-impulse-correlation.service';
import { VolumeChurnService } from './services/volume-churn.service';
// RSI Divergence
import { RvwapSlopeDivergenceService } from './services/rvwap-slope-divergence.service';
// ✅ VZO Divergence (New)
import { RvwapVzoDivergenceService } from './services/rvwap-vzo-divergence.service';

// --- 3. KAMA Сервисы ---
import { KamaRegimeService } from './services/kama-regime.service';
import { KamaCrossesService } from './services/kama-crosses.service';

// --- 4. RVWAP Сервисы ---
import { RvwapRegimeService } from './services/rvwap-regime.service';
import { RvwapCrossesService } from './services/rvwap-crosses.service';
import { RvwapMomentumReversalService } from './services/rvwap-momentum-reversal.service';

// --- 5. OBV Сервисы ---
import { ObvBreadthService } from './services/obv-breadth.service';

// --- 6. CMF Сервисы ---
import { CmfRegimeService } from './services/cmf-regime.service';
import { CmfCrossesService } from './services/cmf-crosses.service';
import { CmfRvwapDivergenceService } from './services/cmf-rvwap-divergence.service';

// --- 7. DELTA / Z-SCORE Сервисы ---
import { DeltaRvwapAbsorptionService } from './services/delta-rvwap-absorption.service';
import { ZScoreRegimeService } from './services/z-score-regime.service';
import { VolatilityAnomalyService } from './services/volatility-anomaly.service';

// --- 8. TREND QUALITY / ADX / MACD / ENTROPY ---
import { AdxMedianService } from './services/adx-median.service';
import { MacdImpulseService } from './services/macd-impulse.service';
import { MarketEntropyService } from './services/market-entropy.service';
import { EntropyStrategiesService } from './services/entropy-strategies.service';
import { MarketPhasesService } from './services/market-phases.service';
import { MarketGravityService } from './services/market-gravity.service';

// --- 9. RSI / VZO Сервисы ---
import { RsiMedianService } from './services/rsi-median.service';
import { VzoMedianService } from './services/vzo-median.service';

import { CoinsAggregatedAnalyticsCharts } from './coins-aggregated-analytics-charts/coins-aggregated-analytics-charts';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';
import { AnalyticsChartsData } from '../models/analytics-charts-data.model';
import { AnalyticsTab } from '../models/analytics-tab.model';
import { CachedWidgetData } from '../models/cache-widget-data.model';
import { MarketData } from '../models/kline.model';

@Component({
  selector: 'app-coins-aggregated-analytics',
  standalone: true,
  imports: [CommonModule, CoinsAggregatedAnalyticsCharts, LoadingSpinnerComponent],
  templateUrl: './coins-aggregated-analytics.html',
  styleUrls: ['./coins-aggregated-analytics.scss'],
})
export class CoinsAggregatedAnalytics implements OnInit {
  private coinsService = inject(CoinsDataService);
  private klineService = inject(KlineDataService);

  // --- ИНЖЕКТ БАЗОВЫХ СЕРВИСОВ ---
  private regimeService = inject(MarketRegimeService);
  private compositeService = inject(MarketCompositeService);
  private patternService = inject(PatternRadarService);
  private breakoutService = inject(ExtremumBreakoutService);

  private emaRegimeService = inject(EmaRegimeService);
  private emaCrossesService = inject(EmaCrossesService);
  private emaFanService = inject(EmaFanService);
  private emaFanSlopeService = inject(EmaFanSlopeService);

  // 🔥 INJECT НОВЫХ СЕРВИСОВ
  private trendRolloverService = inject(TrendRolloverService);
  private breakingIceService = inject(BreakingIceService);
  private btcImpulseService = inject(BtcImpulseCorrelationService);
  private volumeChurnService = inject(VolumeChurnService);

  private rvwapSlopeDivService = inject(RvwapSlopeDivergenceService); // RSI
  private rvwapVzoDivService = inject(RvwapVzoDivergenceService); // VZO (New)

  private kamaRegimeService = inject(KamaRegimeService);
  private kamaCrossesService = inject(KamaCrossesService);

  private rvwapRegimeService = inject(RvwapRegimeService);
  private rvwapCrossesService = inject(RvwapCrossesService);
  private rvwapReversalService = inject(RvwapMomentumReversalService);

  private obvService = inject(ObvBreadthService);

  private cmfService = inject(CmfRegimeService);
  private cmfCrossesService = inject(CmfCrossesService);
  private cmfRvwapService = inject(CmfRvwapDivergenceService);

  private deltaAbsService = inject(DeltaRvwapAbsorptionService);
  private zScoreService = inject(ZScoreRegimeService);
  private volAnomalyService = inject(VolatilityAnomalyService);

  private adxMedianService = inject(AdxMedianService);
  private macdImpulseService = inject(MacdImpulseService);
  private entropyService = inject(MarketEntropyService);
  private entStratService = inject(EntropyStrategiesService);
  private phasesService = inject(MarketPhasesService);
  private gravityService = inject(MarketGravityService);

  private rsiMedianService = inject(RsiMedianService);
  private vzoMedianService = inject(VzoMedianService);

  public isLoading = signal<boolean>(true);
  public chartsData = signal<AnalyticsChartsData | null>(null);
  public chartTitle = signal<string>('Market Overview');

  private allMarketData = new Map<string, MarketData>();
  private widgetCache: Record<string, CachedWidgetData> = {};

  // 🔥 ОБНОВЛЕННЫЙ СПИСОК ТАБОВ
  public tabs: AnalyticsTab[] = [
    { id: 'orderflow', label: 'Orderflow Regime', hasChart: true },
    { id: 'composite', label: 'Market Composite', hasChart: true },
    { id: 'patterns', label: 'Pattern Radar', hasChart: true },
    { id: 'breakouts', label: 'Extremum Breakouts', hasChart: true },

    { id: 'ema_regime', label: 'EMA Trend', hasChart: true },
    { id: 'ema_crosses', label: 'EMA Crosses', hasChart: true },
    { id: 'ema_fan', label: 'EMA Fan Structure', hasChart: true },
    { id: 'ema_fan_slope', label: 'EMA Fan Reversals', hasChart: true },

    // 🔥 ГРУППА "Smart Money"
    { id: 'trend_rollover', label: 'Trend Rollover (Exhaustion)', hasChart: true },
    { id: 'breaking_ice', label: 'Breaking Ice (Deep Value)', hasChart: true },
    { id: 'btc_impulse', label: 'BTC Impulse Reaction', hasChart: true },
    { id: 'vol_churn', label: 'Volume Churn (Effort vs Result)', hasChart: true },

    // RSI Divergence
    { id: 'rvwap_slope_div', label: 'RVWAP Div (RSI Slope)', hasChart: true },
    // ✅ VZO Divergence
    { id: 'rvwap_vzo_div', label: 'RVWAP Div (VZO Slope)', hasChart: true },

    { id: 'kama_regime', label: 'KAMA Trend', hasChart: true },
    { id: 'kama_crosses', label: 'KAMA Crosses', hasChart: true },

    { id: 'adx_median', label: 'ADX Trend Power', hasChart: true },
    { id: 'macd_impulse', label: 'MACD Impulse', hasChart: true },

    { id: 'phases', label: 'Market Phase Matrix', hasChart: true },
    { id: 'gravity', label: 'Market Gravity', hasChart: true },

    { id: 'rvwap_regime', label: 'RVWAP Structure', hasChart: true },
    { id: 'rvwap_crosses', label: 'RVWAP Impulses', hasChart: true },
    { id: 'rvwap_reversal', label: 'RVWAP Reversals (Momentum)', hasChart: true },
    { id: 'cmf_regime', label: 'CMF Flow', hasChart: true },
    { id: 'cmf_crosses', label: 'CMF Crosses', hasChart: true },
    { id: 'cmf_rvwap', label: 'CMF/RVWAP Divergence', hasChart: true },

    { id: 'zscore_regime', label: 'Z-Score Anomalies', hasChart: true },
    { id: 'vol_anomaly', label: 'Volatility Anomalies', hasChart: true },

    { id: 'rsi_median', label: 'RSI Median', hasChart: true },
    { id: 'vzo_median', label: 'VZO Median', hasChart: true },
  ];

  public activeTab = signal<AnalyticsTab>(this.tabs[0]);

  async ngOnInit() {
    await this.coinsService.init();
    await this.prepareAllAnalytics();
    this.selectTab(this.activeTab());
  }

  private async prepareAllAnalytics() {
    this.isLoading.set(true);
    this.allMarketData.clear();
    this.widgetCache = {};

    try {
      const tfs: Timeframe[] = ['1h', '4h', '8h', '12h', 'D'];
      console.log('🔄 [Aggregated] Loading data for:', tfs);

      const results = await Promise.all(tfs.map((tf) => this.klineService.getKlines(tf)));

      results.forEach((data, index) => {
        if (data && data.data && data.data.length > 0) {
          this.allMarketData.set(tfs[index], data);
        }
      });

      if (this.allMarketData.size > 0) {
        // ... (Существующие виджеты) ...
        this.widgetCache['orderflow'] = {
          charts: this.regimeService.getWidgetData(this.allMarketData),
          title: 'Market Orderflow Regime (Accumulation vs Liquidation)',
        };
        this.widgetCache['composite'] = {
          charts: this.compositeService.getWidgetData(this.allMarketData),
          title: 'Market Composite Index (Normalized Median vs BTC)',
        };
        this.widgetCache['patterns'] = {
          charts: this.patternService.getWidgetData(this.allMarketData),
          title: 'Market Pattern Radar (Sentiment Structure)',
        };
        this.widgetCache['breakouts'] = {
          charts: this.breakoutService.getWidgetData(this.allMarketData),
          title: 'Market Extremum Breakouts (New Highs vs New Lows)',
        };
        this.widgetCache['ema_regime'] = {
          charts: this.emaRegimeService.getWidgetData(this.allMarketData),
          title: 'Market EMA Regime (Trend Depth)',
        };
        this.widgetCache['ema_crosses'] = {
          charts: this.emaCrossesService.getWidgetData(this.allMarketData),
          title: 'Market EMA Crosses (Breakout Impulses)',
        };
        this.widgetCache['ema_fan'] = {
          charts: this.emaFanService.getWidgetData(this.allMarketData),
          title: 'EMA Fan Structure (50-100-150 Alignment)',
        };
        this.widgetCache['ema_fan_slope'] = {
          charts: this.emaFanSlopeService.getWidgetData(this.allMarketData),
          title: 'EMA Fan Reversals (Trend Structure vs Momentum)',
        };

        this.widgetCache['trend_rollover'] = {
          charts: this.trendRolloverService.getWidgetData(this.allMarketData),
          title: 'Trend Rollover: Structure vs Momentum Divergence',
        };
        this.widgetCache['breaking_ice'] = {
          charts: this.breakingIceService.getWidgetData(this.allMarketData),
          title: 'Breaking Ice: Deep Pullbacks (Trend Structure + Deep Value)',
        };
        this.widgetCache['btc_impulse'] = {
          charts: this.btcImpulseService.getWidgetData(this.allMarketData),
          title: 'BTC Impulse Reaction: Panic vs Decoupling (Strength)',
        };
        this.widgetCache['vol_churn'] = {
          charts: this.volumeChurnService.getWidgetData(this.allMarketData),
          title: 'Volume Churn: High Volume on Stalled Price (Reversal)',
        };

        // RSI Slope
        this.widgetCache['rvwap_slope_div'] = {
          charts: this.rvwapSlopeDivService.getWidgetData(this.allMarketData),
          title: 'RVWAP 1SD Divergence (Price vs RSI Slope)',
        };
        // ✅ VZO Slope
        this.widgetCache['rvwap_vzo_div'] = {
          charts: this.rvwapVzoDivService.getWidgetData(this.allMarketData),
          title: 'RVWAP 1SD Divergence (Price vs VZO Slope)',
        };

        this.widgetCache['kama_regime'] = {
          charts: this.kamaRegimeService.getWidgetData(this.allMarketData),
          title: 'Market KAMA Trend (Adaptive Trend Strength)',
        };
        this.widgetCache['kama_crosses'] = {
          charts: this.kamaCrossesService.getWidgetData(this.allMarketData),
          title: 'Market KAMA Crosses (Adaptive Breakouts)',
        };
        this.widgetCache['adx_median'] = {
          charts: this.adxMedianService.getWidgetData(this.allMarketData),
          title: 'Market Trend Power (Median ADX/DI+/DI-)',
        };
        this.widgetCache['macd_impulse'] = {
          charts: this.macdImpulseService.getWidgetData(this.allMarketData),
          title: 'MACD Impulse (Momentum Breath)',
        };
        this.widgetCache['entropy'] = {
          charts: this.entropyService.getWidgetData(this.allMarketData),
          title: 'Market Entropy Index (Chaos vs Order)',
        };
        this.widgetCache['ent_strategies'] = {
          charts: this.entStratService.getWidgetData(this.allMarketData),
          title: 'Market Opportunities: Clean Breaks vs Traps',
        };
        this.widgetCache['phases'] = {
          charts: this.phasesService.getWidgetData(this.allMarketData),
          title: 'Market Phases: Entropy vs Trend Strength',
        };
        this.widgetCache['gravity'] = {
          charts: this.gravityService.getWidgetData(this.allMarketData),
          title: 'Market Gravity: Elasticity',
        };
        this.widgetCache['rvwap_regime'] = {
          charts: this.rvwapRegimeService.getWidgetData(this.allMarketData),
          title: 'Market RVWAP Structure (Bands Depth: FOMO to Panic)',
        };
        this.widgetCache['rvwap_crosses'] = {
          charts: this.rvwapCrossesService.getWidgetData(this.allMarketData),
          title: 'Market RVWAP Impulses (Breakouts)',
        };
        this.widgetCache['rvwap_reversal'] = {
          charts: this.rvwapReversalService.getWidgetData(this.allMarketData),
          title: 'RVWAP Reversals (Momentum)',
        };
        this.widgetCache['obv_breadth'] = {
          charts: this.obvService.getWidgetData(this.allMarketData),
          title: 'Market OBV Breadth (Volume Trend)',
        };
        this.widgetCache['cmf_regime'] = {
          charts: this.cmfService.getWidgetData(this.allMarketData),
          title: 'Money Flow Breadth (CMF > 0 vs < 0)',
        };
        this.widgetCache['cmf_crosses'] = {
          charts: this.cmfCrossesService.getWidgetData(this.allMarketData),
          title: 'CMF Zero Crosses (New Inflow vs New Outflow)',
        };
        this.widgetCache['cmf_rvwap'] = {
          charts: this.cmfRvwapService.getWidgetData(this.allMarketData),
          title: 'CMF & RVWAP Divergence',
        };
        this.widgetCache['delta_rvwap'] = {
          charts: this.deltaAbsService.getWidgetData(this.allMarketData),
          title: 'Volume Delta Absorption (Limit Order Activity)',
        };
        this.widgetCache['zscore_regime'] = {
          charts: this.zScoreService.getWidgetData(this.allMarketData),
          title: 'Market Anomalies (Z-Score > 2σ)',
        };
        this.widgetCache['vol_anomaly'] = {
          charts: this.volAnomalyService.getWidgetData(this.allMarketData),
          title: 'Volatility Anomalies (Z-Score Expansion Analysis)',
        };
        this.widgetCache['rsi_median'] = {
          charts: this.rsiMedianService.getWidgetData(this.allMarketData),
          title: 'Market RSI Median',
        };
        this.widgetCache['vzo_median'] = {
          charts: this.vzoMedianService.getWidgetData(this.allMarketData),
          title: 'Market VZO Median',
        };
      }
    } catch (err) {
      console.error('❌ Error loading aggregated analytics:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  public selectTab(tab: AnalyticsTab) {
    this.activeTab.set(tab);

    this.chartsData.set(null);
    this.chartTitle.set(tab.label);

    setTimeout(() => {
      if (this.widgetCache[tab.id]) {
        const cached = this.widgetCache[tab.id];
        this.chartsData.set(cached.charts);
        this.chartTitle.set(cached.title);
      }
    }, 0);
  }
}
