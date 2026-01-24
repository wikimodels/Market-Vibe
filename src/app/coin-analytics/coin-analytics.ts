import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

// Сервисы
import { CoinsDataService } from '../shared/services/coin-data.service';
import { KlineDataService, Timeframe } from '../shared/services/kline-data.service';
import { ZVelocityService } from './services/z-velocity.service';
import { ZScoreService } from './services/z-score.service';

import { CoinLinksService } from '../shared/services/coin-links.service';

// Компоненты
import { CoinAnalyticsCharts } from './coin-analytics-charts/coin-analytics-charts';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';

// Модели
import { WorkingCoin } from '../shared/models/working-coin.model';
import { AnalyticsTab } from '../models/analytics-tab.model';
import { MarketData } from '../models/kline.model';
import { NormCompositionService } from './services/norm-compositions.service';
import { CachedWidgetData } from '../models/cache-widget-data.model';
import { AnalyticsChartsData } from '../models/analytics-charts-data.model';

@Component({
  selector: 'app-coin-detail-analytics',
  standalone: true,
  imports: [CommonModule, CoinAnalyticsCharts, LoadingSpinnerComponent],
  templateUrl: './coin-analytics.html',
  styleUrls: ['./coin-analytics.scss'],
})
export class CoinAnalytics implements OnInit {
  private route = inject(ActivatedRoute);
  private coinsService = inject(CoinsDataService);
  private klineService = inject(KlineDataService);

  private zVelocityService = inject(ZVelocityService);
  private zScoreService = inject(ZScoreService);
  private normService = inject(NormCompositionService); // 🚀 2. Инжект

  public linksService = inject(CoinLinksService);

  // КЭШ и данные
  private widgetCache: Record<string, CachedWidgetData> = {};
  private allMarketData = new Map<string, MarketData>();

  public symbol = signal<string>('');
  public coin = signal<WorkingCoin | null>(null);
  public notFound = signal<boolean>(false);

  public isLoading = signal<boolean>(true);

  public chartsData = signal<AnalyticsChartsData | null>(null);
  public chartTitle = signal<string>('');

  public tabs: AnalyticsTab[] = [
    { id: 'z-score', label: 'Z-Score', hasChart: true },
    { id: 'z-velocity', label: 'Z-Velocity', hasChart: true },
    { id: 'norms', label: 'Norms', hasChart: true }, // 🚀 3. Новый таб
    { id: 'technical', label: 'Technical', hasChart: false },
    { id: 'orderflow', label: 'Orderflow', hasChart: false },
    { id: 'levels', label: 'Levels', hasChart: false },
  ];

  public activeTab = signal<AnalyticsTab>(this.tabs[0]);

  async ngOnInit() {
    const symbolParam = this.route.snapshot.paramMap.get('symbol');

    if (symbolParam) {
      this.symbol.set(symbolParam);
      this.chartTitle.set(symbolParam);

      await this.coinsService.init();

      const allCoins = this.coinsService.getCurrentCoins();
      const found = allCoins.find((c) => c.symbol.includes(symbolParam));

      if (found) {
        this.coin.set(found);
        this.notFound.set(false);

        // Грузим и считаем ВСЁ сразу
        await this.prepareAllAnalytics();

        // Показываем активный таб
        this.selectTab(this.activeTab());
      } else {
        this.notFound.set(true);
        this.isLoading.set(false);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  /**
   * ЯДЕРНЫЙ МЕТОД: Грузит всё, считает всё.
   */
  private async prepareAllAnalytics() {
    this.isLoading.set(true);

    try {
      // 1. Параллельная загрузка
      const tfs: Timeframe[] = ['1h', '4h', '8h', '12h', 'D'];
      const results = await Promise.all(tfs.map((tf) => this.klineService.getKlines(tf)));

      results.forEach((data, index) => {
        if (data) {
          this.allMarketData.set(tfs[index], data);
        }
      });

      // 2. Генерация виджетов (Синхронно)

      // Z-Velocity
      const zVelData = this.zVelocityService.getWidgetData(this.allMarketData);
      this.widgetCache['z-velocity'] = {
        charts: zVelData.charts,
        title: zVelData.metricHeader,
      };

      // Z-Score
      const zScoreData = this.zScoreService.getWidgetData(this.allMarketData);
      this.widgetCache['z-score'] = {
        charts: zScoreData.charts,
        title: zScoreData.metricHeader,
      };

      // 🚀 4. Market Norms
      const normData = this.normService.getWidgetData(this.allMarketData);
      this.widgetCache['norms'] = {
        charts: normData.charts,
        title: normData.metricHeader,
      };
    } catch (err) {
      console.error('Ошибка при подготовке аналитики:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  public selectTab(tab: AnalyticsTab) {
    this.activeTab.set(tab);

    if (this.widgetCache[tab.id]) {
      const cached = this.widgetCache[tab.id];
      this.chartsData.set(cached.charts);
      this.chartTitle.set(cached.title);
    } else {
      // Для пустых табов (Technical, Levels...)
      this.chartsData.set(null);
      this.chartTitle.set(this.symbol());
    }
  }

  // --- Helpers ---
  public async hardReload() {
    const symbol = this.symbol();
    if (confirm(`Delete cache for ${symbol} and reload?`)) {
      this.isLoading.set(true);
      try {
        // Предполагаем, что вы добавили этот метод в klineService
        // await this.klineService.removeCoin(symbol);
        this.widgetCache = {};
        window.location.reload();
      } catch (e) {
        console.error(e);
        this.isLoading.set(false);
      }
    }
  }

  get tvLink(): string {
    const c = this.coin();
    return c ? this.linksService.tradingViewLink(this.symbol(), c.exchanges) : '';
  }

  get cgLink(): string {
    const c = this.coin();
    return c ? this.linksService.coinglassLink(this.symbol(), c.exchanges) : '';
  }
}
