import { Injectable } from '@angular/core';
import { EChartsOption, SeriesOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

export type Timeframe = '1h' | '4h' | '8h' | '12h' | 'D';

export interface VwapGravityWidgetData {
  metricName: string;
  metricHeader: string;
  charts: Record<string, EChartsOption>;
}

/**
 * Строит графики «VWAP Gravity» для пяти таймфреймов (1h, 4h, 8h, 12h, D).
 *
 * Данные уже посчитаны пайплайном (IndicatorPipelineService → calculateVwapGravity)
 * и лежат в полях candle:
 *   - vwapGravityPct  — доля свечей ниже RVWAP (медвежья гравитация, 0–1)
 *   - vwapBuoyancyPct — доля свечей выше RVWAP (бычья буйность, 0–1)
 *
 * Показывает:
 *   🔴 Gravity  (below RVWAP) — красная линия с заливкой
 *   🟢 Buoyancy (above RVWAP) — зелёная линия с заливкой
 *   🟡 Threshold 70%          — жёлтый пунктир (порог ShortScreener)
 */
@Injectable({
  providedIn: 'root',
})
export class VwapGravityService {
  private readonly WINDOW = 48;
  private readonly THRESHOLD_PCT = 70; // %

  private readonly timeframes: Timeframe[] = ['1h', '4h', '8h', '12h', 'D'];

  private colors = {
    gravity:   '#ff4d4d', // Красный — давление вниз
    buoyancy:  '#00e676', // Зелёный — давление вверх
    threshold: '#ffcc00', // Жёлтый  — граница 70%
  };

  public getWidgetData(dataMap: Map<string, MarketData>): VwapGravityWidgetData {
    const charts: Record<string, EChartsOption> = {};

    this.timeframes.forEach((tf) => {
      const data = dataMap.get(tf);
      if (data) {
        const option = this.buildChart(data, tf);
        if (option) charts[tf] = option;
      }
    });

    return {
      metricName: 'vwap-gravity',
      metricHeader: `VWAP Gravity (${this.WINDOW} candles)`,
      charts,
    };
  }

  private buildChart(data: MarketData, tf: Timeframe): EChartsOption | null {
    if (!data.data || data.data.length === 0) return null;
    const coin = data.data[0];
    const candles = coin.candles;
    if (!candles || candles.length === 0) return null;

    const toPercent = (v: any): number => {
      if (v === undefined || v === null || isNaN(v)) return NaN;
      return parseFloat((v * 100).toFixed(2));
    };

    const times       = candles.map((c) => c.openTime);
    const gravityData = candles.map((c) => toPercent((c as any)['vwapGravityPct']));
    const buoyData    = candles.map((c) => toPercent((c as any)['vwapBuoyancyPct']));

    const hasData = (arr: number[]) => arr.some((v) => !isNaN(v) && v > 0);
    if (!hasData(gravityData) && !hasData(buoyData)) return null;

    const thresholdLine = new Array(times.length).fill(this.THRESHOLD_PCT);

    const seriesList: SeriesOption[] = [
      // ── Gravity (below RVWAP) ─────────────────────────────────────────────
      {
        name: 'Gravity (below)',
        type: 'line',
        showSymbol: false,
        smooth: false,
        data: gravityData,
        lineStyle: { width: 2, color: this.colors.gravity },
        itemStyle: { color: this.colors.gravity },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255,77,77,0.30)' },
              { offset: 1, color: 'rgba(255,77,77,0.02)' },
            ],
          },
        },
        z: 3,
      } as SeriesOption,

      // ── Buoyancy (above RVWAP) ────────────────────────────────────────────
      {
        name: 'Buoyancy (above)',
        type: 'line',
        showSymbol: false,
        smooth: false,
        data: buoyData,
        lineStyle: { width: 2, color: this.colors.buoyancy },
        itemStyle: { color: this.colors.buoyancy },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,230,118,0.25)' },
              { offset: 1, color: 'rgba(0,230,118,0.02)' },
            ],
          },
        },
        z: 2,
      } as SeriesOption,

      // ── Threshold 70% ─────────────────────────────────────────────────────
      {
        name: 'Threshold 70%',
        type: 'line',
        showSymbol: false,
        data: thresholdLine,
        lineStyle: { width: 1, type: 'dashed', color: this.colors.threshold, opacity: 0.75 },
        itemStyle: { color: this.colors.threshold },
        z: 4,
      } as SeriesOption,
    ];

    const isDay = tf === 'D' || tf === '12h';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderColor: '#333',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const date = new Date(Number(params[0].axisValue));
          const dd  = date.getDate().toString().padStart(2, '0');
          const mm  = (date.getMonth() + 1).toString().padStart(2, '0');
          const hh  = date.getHours().toString().padStart(2, '0');
          const min = date.getMinutes().toString().padStart(2, '0');
          const dateStr = isDay ? `${dd}/${mm}` : `${dd}/${mm} ${hh}:${min}`;
          let result = `<div style="font-weight:bold;margin-bottom:5px;color:#aaa">${dateStr}</div>`;
          params.forEach((p: any) => {
            const val = typeof p.value === 'number' && !isNaN(p.value)
              ? p.value.toFixed(1) + '%'
              : '—';
            result += `<div>${p.marker} ${p.seriesName}: <span style="float:right;margin-left:12px">${val}</span></div>`;
          });
          return result;
        },
      },
      legend: {
        show: true,
        top: 0,
        textStyle: { color: '#ccc', fontSize: 11 },
        selectedMode: 'multiple',
      },
      toolbox: {
        show: true,
        feature: { restore: { show: true, title: 'Reset' } },
        iconStyle: { borderColor: '#9090a0' },
        right: '5%',
        top: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true },
      ],
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: {
          color: '#888',
          fontSize: 10,
          formatter: (value: string) => {
            const date = new Date(Number(value));
            return isDay
              ? `${date.getDate()}/${date.getMonth() + 1}`
              : `${date.getHours()}:00`;
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#222' } },
        axisLabel: {
          color: '#888',
          fontSize: 10,
          formatter: (v: number) => `${v}%`,
        },
      },
      series: seriesList,
    };
  }
}
