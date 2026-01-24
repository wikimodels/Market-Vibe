import { Injectable } from '@angular/core';
import { EChartsOption, SeriesOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

// Типы таймфреймов
export type Timeframe = '1h' | '4h' | '8h' | '12h' | 'D';

export interface NormWidgetData {
  metricName: string;
  metricHeader: string;
  metricReference: string;
  charts: Record<string, EChartsOption>;
}

@Injectable({
  providedIn: 'root',
})
export class NormCompositionService {
  // Цветовая палитра (как в других виджетах для консистентности)
  private colors = {
    fundingRate: '#ff4d88', // Pink
    price: '#00FFFF', // Cyan
    openInterest: '#00FF00', // Green
    volumeDelta: '#A020F0', // Purple
    volume: '#d1e0e0', // Light Grey
  };

  private readonly timeframes: Timeframe[] = ['1h', '4h', '8h', '12h', 'D'];

  /**
   * Получает готовые данные из кэша и строит конфиги для графиков
   */
  public getWidgetData(dataMap: Map<string, MarketData>): NormWidgetData {
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
      metricName: 'market-norms',
      metricHeader: 'Market Norms (0-1)',
      // Можно создать html файл с описанием, если нужно
      metricReference: './assets/html/market-norms.html',
      charts: charts,
    };
  }

  private buildChart(data: MarketData, tf: Timeframe): EChartsOption | null {
    if (!data.data || data.data.length === 0) return null;
    const coin = data.data[0];
    const candles = coin.candles;
    if (!candles || candles.length === 0) return null;

    const times = candles.map((c) => c.openTime);

    // Функция безопасного извлечения (если данных нет, вернет 0)
    const getVal = (val: any): number => {
      if (val === undefined || val === null || typeof val !== 'number' || Number.isNaN(val)) {
        return 0;
      }
      return val;
    };

    // Читаем НОРМАЛИЗОВАННЫЕ данные [0...1]
    const nClose = candles.map((c) => getVal((c as any)['closePriceNorm']));
    const nOi = candles.map((c) => getVal((c as any)['openInterestNorm']));
    const nVolume = candles.map((c) => getVal((c as any)['volumeNorm']));
    const nVolDelta = candles.map((c) => getVal((c as any)['volumeDeltaNorm']));

    const seriesList: SeriesOption[] = [];
    const hasData = (arr: number[]) => arr.some((v) => v > 0);

    // 1. PRICE (Cyan Line) - Главная линия
    if (hasData(nClose)) {
      seriesList.push({
        name: 'Price',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: nClose,
        lineStyle: { width: 2, color: this.colors.price },
        itemStyle: { color: this.colors.price },
        z: 10, // Поверх остальных
      });
    }

    // 2. FUNDING RATE (Pink Line) - Только для 8h
    if (tf === '8h') {
      const nFunding = candles.map((c) => getVal((c as any)['fundingRateNorm']));
      if (hasData(nFunding)) {
        seriesList.push({
          name: 'FR',
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: nFunding,
          lineStyle: { width: 2, color: this.colors.fundingRate },
          itemStyle: { color: this.colors.fundingRate },
        });
      }
    }

    // 3. OPEN INTEREST (Green Line)
    if (hasData(nOi)) {
      seriesList.push({
        name: 'OI',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: nOi,
        lineStyle: { width: 2, color: this.colors.openInterest },
        itemStyle: { color: this.colors.openInterest },
      });
    }

    // 4. VOLUME (Grey Dashed) - Фоновый шум
    if (hasData(nVolume)) {
      seriesList.push({
        name: 'Vol',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: nVolume,
        lineStyle: { width: 1, type: 'dashed', color: this.colors.volume, opacity: 0.5 },
        itemStyle: { color: this.colors.volume },
      });
    }

    // 5. DELTA VOLUME (Purple Dashed)
    if (hasData(nVolDelta)) {
      seriesList.push({
        name: 'Delta',
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: nVolDelta,
        lineStyle: { width: 1, type: 'dashed', color: this.colors.volumeDelta },
        itemStyle: { color: this.colors.volumeDelta },
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
          // Форматирование даты
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const dateStr = `${day}/${month} ${hours}:${minutes}`;

          let result = `<div style="font-weight:bold; margin-bottom:4px; color:#fff">${dateStr}</div>`;

          params.forEach((param: any) => {
            const val = Number(param.value);
            // Показываем проценты (0.55 -> 55%) или просто число 0.55
            // Для норм. данных лучше просто число с 2 знаками
            const valStr = val.toFixed(2);
            result += `<div>${param.marker} ${param.seriesName}: <span style="float:right; margin-left:12px; color:#fff">${valStr}</span></div>`;
          });
          return result;
        },
      },
      legend: {
        show: true,
        top: 0,
        textStyle: { color: '#ccc' },
        // При клике на легенду можно скрывать линии
        selectedMode: 'multiple',
      },
      toolbox: {
        show: true,
        feature: {
          restore: { show: true, title: 'Reset' },
        },
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
        min: 0,
        max: 1, // Жестко фиксируем от 0 до 1
        splitLine: { lineStyle: { color: '#222' } },
        axisLabel: { color: '#888' },
      },
      series: seriesList,
    };
  }
}
