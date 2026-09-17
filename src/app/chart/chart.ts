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
  CrosshairMode,
  HistogramData,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  LineStyle,
  TickMarkType,
  Time,
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
const MSK_TZ = 'Europe/Moscow';

/** Только Москва — без сдвига данных, чисто форматирование */
function fmtMskTick(time: Time, type: TickMarkType): string | null {
  const ts = typeof time === 'number' ? (time as number) : NaN;
  if (!isFinite(ts)) return null;
  const d = new Date(ts * 1000);
  try {
    switch (type) {
      case TickMarkType.Year:
        return new Intl.DateTimeFormat('ru-RU', { timeZone: MSK_TZ, year: 'numeric' }).format(d);
      case TickMarkType.Month:
        return new Intl.DateTimeFormat('ru-RU', {
          timeZone: MSK_TZ,
          month: 'short',
          year: '2-digit',
        }).format(d);
      case TickMarkType.DayOfMonth:
        return new Intl.DateTimeFormat('ru-RU', {
          timeZone: MSK_TZ,
          day: '2-digit',
          month: 'short',
        }).format(d);
      case TickMarkType.Time:
        return new Intl.DateTimeFormat('ru-RU', {
          timeZone: MSK_TZ,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
      case TickMarkType.TimeWithSeconds:
        return new Intl.DateTimeFormat('ru-RU', {
          timeZone: MSK_TZ,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(d);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
function fmtMskCrosshair(time: Time): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts = typeof time === 'number' ? (time as number) : NaN;
  if (!isFinite(ts)) return String(time ?? '');
  const d = new Date(ts * 1000);
  try {
    // красива дата/время: 17 сент. 15:00
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: MSK_TZ,
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleString('ru-RU');
  }
}
function fmtPrice(price: number): string {
  if (!isFinite(price)) return '';
  const abs = Math.abs(price);
  // тебе нужно 2-3 знака после запятой, без лишней точности
  // CHZ ~0.04 -> 0.040, BTC ~90000 -> 90000.12, микро <0.001 -> больше знаков чтобы не 0.000
  let dec = 2;
  if (abs >= 1) dec = 2;
  else if (abs >= 0.01) dec = 3; // 0.034 -> 0.034
  else if (abs >= 0.001) dec = 3;
  else dec = 6; // 0.000012 -> 0.000012
  let s = price.toFixed(dec);
  // для 2-3 знаков хвостовые нули не критичны — оставляем как есть, чтобы было ровно 0.040
  // но для микро (6) чистим
  if (dec > 3) s = s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  return s;
}

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
  // — оптимизация: кэш нарезанных серий + дебаунс —
  private seriesCache = new Map<
    string,
    { updatedAt: number; cd: CandlestickData[]; vd: HistogramData[]; ema50: LineData[]; ema100: LineData[]; ema150: LineData[] }
  >();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: { coin: WorkingCoin; tf: TF } | null = null;

  constructor() {
    // График следует за выделением: последняя кликнутая пилла
    effect(() => {
      const sel = this.selectionSignal();
      if (sel.length > 0) {
        this.chartCoin.set(sel[sel.length - 1]);
      }
    });
    // Перезагрузка серии при смене монеты/ТФ — дебаунс 90мс чтобы убрать дёрганность при быстрых кликах
    effect(() => {
      const coin = this.chartCoin();
      const tf = this.tf();
      if (coin) this.scheduleLoad(coin, tf);
    });
  }

  private scheduleLoad(coin: WorkingCoin, tf: TF): void {
    this.pending = { coin, tf };
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const p = this.pending;
      if (p) void this.loadSeries(p.coin, p.tf);
    }, 90);
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
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
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
        rightPriceScale: {
          visible: true,
          borderVisible: false,
          borderColor: 'rgba(255,255,255,0.08)',
          textColor: 'rgba(255, 255, 255, 0.62)',
          entireTextOnly: false,
          ticksVisible: false,
          minimumWidth: 74,
          scaleMargins: { top: 0.05, bottom: 0.25 },
        },
        leftPriceScale: { visible: false },
        timeScale: {
          visible: true,
          borderVisible: false,
          borderColor: 'rgba(255,255,255,0.08)',
          timeVisible: true,
          secondsVisible: false,
          ticksVisible: false,
          fixLeftEdge: true,
          fixRightEdge: false,
          rightOffset: 7,
          rightOffsetPixels: 100,
          barSpacing: 6,
          minimumHeight: 22,
          allowBoldLabels: true,
          tickMarkFormatter: (time: Time, type: TickMarkType) => fmtMskTick(time, type),
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            visible: true,
            width: 1 as const,
            color: 'rgba(255,255,255,0.35)',
            style: LineStyle.Dashed,
            labelVisible: false,
          },
          horzLine: { visible: false, labelVisible: false },
        },
        localization: {
          locale: 'ru-RU',
          dateFormat: 'dd.MM.yyyy',
          timeFormatter: (time: Time) => fmtMskCrosshair(time),
          priceFormatter: (p: number) => fmtPrice(p),
        },
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
        priceFormat: { type: 'custom', formatter: fmtPrice, minMove: 0.000001 } as const,
      });
      // scaleMargins уже в rightPriceScale, но дублируем для надёжности после создания серии
      this.chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });
      this.volume = this.chart.addSeries(HistogramSeries, {
        priceScaleId: 'vol',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      this.chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      const emaOpts = {
        lineWidth: 2 as const,
        priceScaleId: 'right',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false as const,
        crosshairMarkerRadius: 0 as const,
        title: '' as const,
      };
      this.ema50 = this.chart.addSeries(LineSeries, { ...emaOpts, color: '#FF9800' });
      this.ema100 = this.chart.addSeries(LineSeries, { ...emaOpts, color: '#EF5350' });
      this.ema150 = this.chart.addSeries(LineSeries, { ...emaOpts, color: '#2962FF' });
      // левая шкала скрыта, правая — видима узкая (только цены), vol — скрыта

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

  /** EMA 50/100/150 за один проход — в 3 раза меньше циклов */
  private calcEMAs(
    values: { time: UTCTimestamp; close: number }[],
    periods: number[],
  ): Map<number, LineData[]> {
    const outs = new Map<number, LineData[]>();
    const sorted = [...periods].sort((a, b) => a - b);
    const max = Math.max(...sorted);
    if (values.length < max) {
      sorted.forEach((p) => outs.set(p, []));
      return outs;
    }
    const ks = new Map(sorted.map((p) => [p, 2 / (p + 1)]));
    const emas = new Map<number, number>();
    sorted.forEach((p) => outs.set(p, []));
    // префиксные суммы для SMA сидов
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i].close;
      for (const p of sorted) {
        if (i === p - 1) {
          const ema0 = sum / p;
          emas.set(p, ema0);
          outs.get(p)!.push({ time: values[i].time, value: ema0 });
        } else if (i >= p) {
          const k = ks.get(p)!;
          const prev = emas.get(p)!;
          const cur = values[i].close * k + prev * (1 - k);
          emas.set(p, cur);
          outs.get(p)!.push({ time: values[i].time, value: cur });
        }
      }
    }
    return outs;
  }

  /** @deprecated одиночный EMA — оставлен для совместимости */
  private calcEMA(values: { time: UTCTimestamp; close: number }[], period: number): LineData[] {
    return this.calcEMAs(values, [period]).get(period) ?? [];
  }

  private applySeries(s: { cd: CandlestickData[]; vd: HistogramData[]; ema50: LineData[]; ema100: LineData[]; ema150: LineData[] }): void {
    // батчим в одном фрейме — один invalidate вместо 5
    const doApply = () => {
      this.candles?.setData(s.cd);
      this.volume?.setData(s.vd);
      this.ema50?.setData(s.ema50);
      this.ema100?.setData(s.ema100);
      this.ema150?.setData(s.ema150);
      this.chart?.timeScale().scrollToRealTime();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(doApply);
    else doApply();
  }

  private async loadSeries(coin: WorkingCoin, tf: TF): Promise<void> {
    const token = ++this.loadToken;
    const cacheKey = `${coin.symbol}|${tf}`;
    const cached = this.seriesCache.get(cacheKey);
    // мгновенная отдача из кэша — без мигания лоадера
    if (cached) {
      this.applySeries(cached);
      this.chartStatus.set('ready');
      // фоном проверим свежесть (RAM hit = 0мс)
      void this.klineData.getKlines(tf).then((m) => {
        if (m && m.updatedAt !== cached.updatedAt) {
          // протух кэш — инвалидируем и перезальём
          this.seriesCache.delete(cacheKey);
          if (token === this.loadToken && this.chartCoin()?.symbol === coin.symbol && this.tf() === tf) {
            void this.loadSeries(coin, tf);
          }
        }
      });
      // префетч остальных ТФ
      this.prefetchOtherTFs(tf);
      return;
    }

    this.chartStatus.set('loading');
    try {
      const market = await this.klineData.getKlines(tf);
      if (token !== this.loadToken) return; // устаревший запрос
      const entry = market ? this.findEntry(market, coin.symbol) : null;
      const raw = (entry?.candles ?? []).filter(
        (c) => c.openTime > 0 && c.openPrice > 0 && c.closePrice > 0,
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
      const closes = cd.map((d) => ({ time: d.time as UTCTimestamp, close: d.close }));
      const emas = this.calcEMAs(closes, [50, 100, 150]);
      const pack = {
        updatedAt: market?.updatedAt ?? 0,
        cd,
        vd,
        ema50: emas.get(50) ?? [],
        ema100: emas.get(100) ?? [],
        ema150: emas.get(150) ?? [],
      };
      this.seriesCache.set(cacheKey, pack);
      // LRU — держим не больше 60 серий
      if (this.seriesCache.size > 60) {
        const first = this.seriesCache.keys().next().value as string;
        this.seriesCache.delete(first);
      }
      this.applySeries(pack);
      this.chartStatus.set('ready');
      this.prefetchOtherTFs(tf);
    } catch (e) {
      if (token !== this.loadToken) return;
      console.error('❌ ChartPage: loadSeries failed', e);
      this.chartStatus.set('error');
    }
  }

  private prefetchOtherTFs(current: TF): void {
    for (const t of this.tfs) {
      if (t === current) continue;
      // fire-and-forget, RAM/IDB hit ~0мс, сеть — в фоне
      void this.klineData.getKlines(t).catch(() => {});
    }
  }
}
