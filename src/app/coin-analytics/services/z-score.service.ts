import { Injectable } from '@angular/core';
import { EChartsOption, SeriesOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

export type Timeframe = '1h' | '4h' | '8h' | '12h' | 'D';

export interface ZScoreWidgetData {
  metricName: string;
  metricHeader: string;
  metricReference: string;
  charts: Record<string, EChartsOption>;
}

@Injectable({
  providedIn: 'root',
})
export class ZScoreService {
  private colors = {
    fundingRate: '#ff4d88',
    price: '#00FFFF',
    openInterest: '#00FF00',
    volumeDelta: '#A020F0',
    volume: '#d1e0e0',
  };

  private readonly timeframes: Timeframe[] = ['1h', '4h', '8h', '12h', 'D'];

  public getWidgetData(dataMap: Map<string, MarketData>): ZScoreWidgetData {
    const charts: Record<string, EChartsOption> = {};

    this.timeframes.forEach((tf) => {
      const data = dataMap.get(tf);
      if (data) {
        const option = this.buildChart(data, tf);
        if (option) {
          charts[tf] = option;
        }
      }
    });

    return {
      metricName: 'z-score',
      metricHeader: 'Z-Score Composition',
      metricReference: './assets/html/z-score.html',
      charts: charts,
    };
  }

  private buildChart(data: MarketData, tf: Timeframe): EChartsOption | null {
    if (!data.data || data.data.length === 0) return null;
    const coin = data.data[0];
    const candles = coin.candles;
    if (!candles || candles.length === 0) return null;

    const times = candles.map((c) => c.openTime);

    // 🚀 НОРМАЛИЗАЦИЯ: Превращаем NaN/Null/Undefined в 0.
    // Если Z-Score не посчитался (старые данные), бар будет высотой 0.
    const normalize = (val: any): number => {
      if (
        val === undefined ||
        val === null ||
        typeof val !== 'number' ||
        Number.isNaN(val) ||
        !isFinite(val)
      ) {
        return 0;
      }
      return val;
    };

    const zClose = candles.map((c) => normalize((c as any)['closePriceZScore']));
    const zOi = candles.map((c) => normalize((c as any)['openInterestZScore']));
    const zVolume = candles.map((c) => normalize((c as any)['volumeZScore']));
    const zVolDelta = candles.map((c) => normalize((c as any)['volumeDeltaZScore']));

    const hasData = (arr: number[]) => arr.some((v) => v !== 0);
    const seriesList: SeriesOption[] = [];

    const commonBarSettings = {
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      large: true,
    };

    if (hasData(zClose)) {
      seriesList.push({
        ...commonBarSettings,
        name: 'Price',
        data: zClose,
        itemStyle: { color: this.colors.price },
      } as SeriesOption);
    }
    if (tf === '8h') {
      const zFunding = candles.map((c) => normalize((c as any)['fundingRateZScore']));
      if (hasData(zFunding)) {
        seriesList.push({
          ...commonBarSettings,
          name: 'FR',
          data: zFunding,
          itemStyle: { color: this.colors.fundingRate },
        } as SeriesOption);
      }
    }
    if (hasData(zOi)) {
      seriesList.push({
        ...commonBarSettings,
        name: 'OI',
        data: zOi,
        itemStyle: { color: this.colors.openInterest },
      } as SeriesOption);
    }
    if (hasData(zVolDelta)) {
      seriesList.push({
        ...commonBarSettings,
        name: 'Delta Vol',
        data: zVolDelta,
        itemStyle: { color: this.colors.volumeDelta },
      } as SeriesOption);
    }
    if (hasData(zVolume)) {
      seriesList.push({
        ...commonBarSettings,
        name: 'Vol',
        data: zVolume,
        itemStyle: { color: this.colors.volume },
      } as SeriesOption);
    }

    if (seriesList.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const date = new Date(Number(params[0].axisValue));
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString().slice(-2);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const dateStr = `${day}-${month}-${year} ${hours}:${minutes}`;

          let result = `<div style="font-weight:normal; margin-bottom:4px;">${dateStr}</div>`;

          params.forEach((param: any) => {
            if (param.value !== undefined && !Number.isNaN(param.value)) {
              const val = Number(param.value);
              if (Math.abs(val) > 0.001) {
                // Скрываем почти нулевые значения
                const marker = param.marker;
                const seriesName = param.seriesName;
                const valueStr = val.toFixed(2);
                result += `<div>${marker} ${seriesName}: <span style="float:right; margin-left:12px; font-weight:normal;">${valueStr}</span></div>`;
              }
            }
          });
          return result;
        },
      },
      legend: { show: true, top: 0, textStyle: { color: '#ccc' } },
      toolbox: {
        show: true,
        feature: { restore: { show: true, title: 'Reset Zoom' } },
        iconStyle: { borderColor: '#9090a0' },
        right: '5%',
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '12%',
        containLabel: true,
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: {
          color: '#888',
          formatter: (value: string) => {
            const date = new Date(Number(value));
            if (tf === 'D' || tf === '12h') {
              return `${date.getDate()}/${date.getMonth() + 1}`;
            } else {
              return `${date.getHours()}:00`;
            }
          },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#222' } },
        axisLabel: { color: '#888' },
      },
      series: seriesList,
    };
  }
}
