import { Injectable } from '@angular/core';
import { EChartsOption, SeriesOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

// Если Timeframe - это строковый тип, можно использовать string,
// но лучше импортировать тип, если он доступен.
// Для простоты здесь используем string, совпадающий с ключами карты.
export type Timeframe = '1h' | '4h' | '8h' | '12h' | 'D';

export interface ZVelocityWidgetData {
  metricName: string;
  metricHeader: string;
  metricReference: string;
  charts: Record<string, EChartsOption>;
}

@Injectable({
  providedIn: 'root',
})
export class ZVelocityService {
  private colors = {
    fundingRate: '#ff4d88',
    price: '#00FFFF',
    openInterest: '#00FF00',
    volumeDelta: '#A020F0',
    volume: '#d1e0e0',
  };

  private readonly timeframes: Timeframe[] = ['1h', '4h', '8h', '12h', 'D'];

  // 🚀 ТЕПЕРЬ СИНХРОННО: Принимаем уже готовые данные
  public getWidgetData(dataMap: Map<string, MarketData>): ZVelocityWidgetData {
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
      metricName: 'z-velocity',
      metricHeader: 'Z-Velocity',
      metricReference: './assets/html/z-velocity.html',
      charts: charts,
    };
  }

  private buildChart(data: MarketData, tf: Timeframe): EChartsOption | null {
    if (!data.data || data.data.length === 0) return null;

    const coin = data.data[0];
    const candles = coin.candles;

    if (!candles || candles.length === 0) return null;

    const times = candles.map((c) => c.openTime);

    const normalize = (val: any): number => {
      if (val === undefined || val === null || typeof val !== 'number' || Number.isNaN(val)) {
        return 0;
      }
      return parseFloat((val / 10000).toFixed(2));
    };

    const sClose = candles.map((c) => normalize(c['slopeZClose']));
    const sOi = candles.map((c) => normalize(c['slopeZOi']));
    const sVolume = candles.map((c) => normalize(c['slopeZVolume']));
    const sVolDelta = candles.map((c) => normalize(c['slopeZVolumeDelta']));

    const hasData = (arr: number[]) => arr.some((v) => v !== 0);

    const seriesList: SeriesOption[] = [];

    if (hasData(sClose)) {
      seriesList.push({
        name: 'Price',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: sClose,
        lineStyle: { width: 2, color: this.colors.price },
        itemStyle: { color: this.colors.price },
      });
    }

    if (tf === '8h') {
      const sFunding = candles.map((c) => normalize(c['slopeZFunding']));
      if (hasData(sFunding)) {
        seriesList.push({
          name: 'FR',
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: sFunding,
          lineStyle: { width: 2, color: this.colors.fundingRate },
          itemStyle: { color: this.colors.fundingRate },
        });
      }
    }

    if (hasData(sOi)) {
      seriesList.push({
        name: 'OI',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: sOi,
        lineStyle: { width: 2, color: this.colors.openInterest },
        itemStyle: { color: this.colors.openInterest },
      });
    }

    if (hasData(sVolDelta)) {
      seriesList.push({
        name: 'Delta Vol',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: sVolDelta,
        lineStyle: { width: 1, type: 'dashed', color: this.colors.volumeDelta },
        itemStyle: { color: this.colors.volumeDelta },
      });
    }

    if (hasData(sVolume)) {
      seriesList.push({
        name: 'Vol',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: sVolume,
        lineStyle: { width: 1, type: 'dashed', color: this.colors.volume },
        itemStyle: { color: this.colors.volume },
      });
    }

    if (seriesList.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
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
            const marker = param.marker;
            const seriesName = param.seriesName;
            const value = typeof param.value === 'number' ? param.value.toFixed(2) : param.value;
            result += `<div>${marker} ${seriesName}: <span style="float:right; margin-left:12px; font-weight:normal;">${value}</span></div>`;
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
