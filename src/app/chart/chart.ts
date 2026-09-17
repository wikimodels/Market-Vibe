import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramData,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  UTCTimestamp,
} from 'lightweight-charts';
import { WorkingCoin } from '../shared/models/working-coin.model';
import { CoinsService } from '../coins/services/coins.service';
import { KlineDataService } from '../shared/services/kline-data.service';
import { GenericSelectionService } from '../shared/services/generic.selection.service';
import { LinksComponent } from '../shared/components/links/links.component';
import { SearchFilterComponent } from '../shared/components/search-filter/search-filter.component';
import { PriceChangeCol } from '../coins/services/coins.service';
import { MarketData, TF } from '../models/kline.model';

const CHART_TFS: TF[] = ['1h', '4h', '8h', '12h', 'D'];
const UP = '#26a69a';
const DOWN = '#ef5350';

@Component({
  selector: 'app-chart-page',
  standalone: true,
  imports: [CommonModule, LinksComponent, SearchFilterComponent],
  templateUrl: './chart.html',
  styleUrls: ['./chart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPage implements AfterViewInit, OnDestroy {
  private coinsService = inject(CoinsService);
  private klineData = inject(KlineDataService);
  private selectionService = inject(GenericSelectionService<WorkingCoin>);

  @ViewChild('chartBox') private chartBox?: ElementRef<HTMLElement>;

  readonly tfs = CHART_TFS;

  coins = signal<WorkingCoin[]>([]);
  filterText = signal<string>('');
  tf = signal<TF>('4h');
  chartCoin = signal<WorkingCoin | null>(null);
  chartStatus = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  changes1h = signal<Map<string, Record<PriceChangeCol, number | null>>>(new Map());

  private selectionSignal = toSignal(this.selectionService.selectionChanges$, {
    initialValue: [] as WorkingCoin[],
  });

  watchSortKey = signal<'symbol' | 'chg'>('symbol');
  watchSortDir = signal<'asc' | 'desc'>('asc');

  onWatchSort(key: 'symbol' | 'chg'): void {
    if (this.watchSortKey() === key) {
      this.watchSortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.watchSortKey.set(key);
      this.watchSortDir.set('asc');
    }
  }

  watchArrow(key: 'symbol' | 'chg'): string {
    if (this.watchSortKey() !== key) return '';
    return this.watchSortDir() === 'asc' ? '▲' : '▼';
  }

  filteredCoins = computed(() => {
    const f = this.filterText().toLowerCase();
    const mul = this.watchSortDir() === 'asc' ? 1 : -1;
    const key = this.watchSortKey();
    const chg = this.changes1h();
    const list = this.coins().filter((c) => !f || c.symbol.toLowerCase().includes(f));
    list.sort((a, b) => {
      if (key === 'chg') {
        const av = chg.get(a.symbol)?.['1h'];
        const bv = chg.get(b.symbol)?.['1h'];
        if (av == null && bv == null) return a.symbol.localeCompare(b.symbol);
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * mul || a.symbol.localeCompare(b.symbol);
      }
      return a.symbol.localeCompare(b.symbol) * mul;
    });
    return list;
  });

  private chart: IChartApi | null = null;
  private candles: ISeriesApi<'Candlestick'> | null = null;
  private volume: ISeriesApi<'Histogram'> | null = null;
  private ema50: ISeriesApi<'Line'> | null = null;
  private ema100: ISeriesApi<'Line'> | null = null;
  private ema150: ISeriesApi<'Line'> | null = null;
  private ro: ResizeObserver | null = null;
  private loadToken = 0;

  constructor() {
    // График следует за выделением: последняя кликнутая пилла
    effect(() => {
      const sel = this.selectionSignal();
      if (sel.length > 0) {
        this.chartCoin.set(sel[sel.length - 1]);
      }
    });
    // Перезагрузка серии при смене монеты/ТФ
    effect(() => {
      const coin = this.chartCoin();
      const tf = this.tf();
      if (coin) void this.loadSeries(coin, tf);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.initChart();
    try {
      const [list, chg] = await Promise.all([
        this.coinsService.getWorkingCoins(),
        this.coinsService.getPriceChanges(['1h']),
      ]);
      this.coins.set(list);
      this.changes1h.set(chg);
      if (!this.chartCoin() && list.length > 0) {
        this.chartCoin.set(list[0]);
      }
    } catch (e) {
      console.error('❌ ChartPage: init failed', e);
      this.chartStatus.set('error');
    }
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.chart?.remove();
    this.chart = null;
  }

  onFilterChange(v: string): void {
    this.filterText.set(v);
  }

  pick(coin: WorkingCoin): void {
    this.selectionService.toggle(coin);
  }

  logoSrc(coin: WorkingCoin): string {
    return 'assets/logo/' + coin.logoUrl;
  }

  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/logo/no-name.svg';
  }

  setTf(tf: TF): void {
    this.tf.set(tf);
  }

  chg1h(symbol: string): number | null {
    return this.changes1h().get(symbol)?.['1h'] ?? null;
  }

  fmtChg(v: number | null): string {
    if (v == null || !isFinite(v)) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  }

  clsChg(v: number | null): string {
    if (v == null) return '';
    return v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  }

  private initChart(): void {
    const el = this.chartBox?.nativeElement;
    if (!el || typeof createChart !== 'function') return;
    try {
      // ВАЖНО: шкалы прячем ПОСЛЕ создания серий — иначе v5 не привязывает
      // серии к шкале и график пустой (см. issue #1403)
      this.chart = createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight || 500,
        layout: {
          background: { type: ColorType.Solid, color: '#121212' },
          textColor: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        crosshair: {
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        timeScale: { visible: false },
      });
      this.candles = this.chart.addSeries(CandlestickSeries, {
        upColor: UP,
        downColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
        borderVisible: false,
        priceScaleId: 'right',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      this.chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });
    this.volume = this.chart.addSeries(HistogramSeries, { priceScaleId: 'vol' });
    this.chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const emaOpts = { lineWidth: 2 as const, priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, title: '' as const };
    this.ema50 = this.chart.addSeries(LineSeries, { ...emaOpts, color: '#FF9800' });
    this.ema100 = this.chart.addSeries(LineSeries, { ...emaOpts, color: '#EF5350' });
    this.ema150 = this.chart.addSeries(LineSeries, { ...emaOpts, color: '#2962FF' });
      // прячем оси только после привязки серий
      this.chart.priceScale('right').applyOptions({ visible: false });
      this.chart.priceScale('left').applyOptions({ visible: false });

      this.ro = new ResizeObserver(() => {
        const box = this.chartBox?.nativeElement;
        if (box && this.chart) this.chart.resize(box.clientWidth, box.clientHeight || 500);
      });
      this.ro.observe(el);
    } catch (e) {
      console.error('❌ ChartPage: initChart failed', e);
      this.chartStatus.set('error');
    }
  }

  private findEntry(data: MarketData, cleanSymbol: string) {
    const norm = (s: string) => s.split(':')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const want = new Set([cleanSymbol + 'USDT', cleanSymbol]);
    return data.data.find((e) => want.has(norm(e.symbol))) ?? null;
  }

  /**
   * EMA как в TradingView: сид — SMA первых N закрытий,
   * дальше close*k + prev*(1-k), k = 2/(N+1).
   */
  private calcEMA(values: { time: UTCTimestamp; close: number }[], period: number): LineData[] {
    if (values.length < period) return [];
    const k = 2 / (period + 1);
    const out: LineData[] = [];
    let sma = 0;
    for (let i = 0; i < period; i++) sma += values[i].close;
    let ema = sma / period;
    out.push({ time: values[period - 1].time, value: ema });
    for (let i = period; i < values.length; i++) {
      ema = values[i].close * k + ema * (1 - k);
      out.push({ time: values[i].time, value: ema });
    }
    return out;
  }

  private async loadSeries(coin: WorkingCoin, tf: TF): Promise<void> {
    const token = ++this.loadToken;
    this.chartStatus.set('loading');
    try {
      const market = await this.klineData.getKlines(tf);
      if (token !== this.loadToken) return; // устаревший запрос
      const entry = market ? this.findEntry(market, coin.symbol) : null;
      const raw = (entry?.candles ?? []).filter(
        (c) => c.openTime > 0 && c.openPrice > 0 && c.closePrice > 0
      );
      if (!this.candles || raw.length < 2) {
        this.chartStatus.set('empty');
        return;
      }
      const cd: CandlestickData[] = raw
        .map((c) => ({
          time: Math.floor(c.openTime / 1000) as UTCTimestamp,
          open: c.openPrice,
          high: c.highPrice,
          low: c.lowPrice,
          close: c.closePrice,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));
      const vd: HistogramData[] = raw.map((c) => ({
        time: Math.floor(c.openTime / 1000) as UTCTimestamp,
        value: c.volume ?? 0,
        color: c.closePrice >= c.openPrice ? 'rgba(38,166,154,0.45)' : 'rgba(239,83,80,0.45)',
      }));
      this.candles.setData(cd);
      this.volume?.setData(vd);
      // EMA 50/100/150 по закрытиям
      if (this.ema50 && this.ema100 && this.ema150) {
        const closes = cd.map((d) => ({ time: d.time as UTCTimestamp, close: d.close }));
        this.ema50.setData(this.calcEMA(closes, 50));
        this.ema100.setData(this.calcEMA(closes, 100));
        this.ema150.setData(this.calcEMA(closes, 150));
      }
      this.chart?.timeScale().scrollToRealTime();
      this.chartStatus.set('ready');
    } catch (e) {
      if (token !== this.loadToken) return;
      console.error('❌ ChartPage: loadSeries failed', e);
      this.chartStatus.set('error');
    }
  }
}
