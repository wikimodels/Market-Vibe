import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

@Injectable({
  providedIn: 'root',
})
export class VzoMedianService {
  public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
    const charts: Record<string, EChartsOption> = {};

    allMarketData.forEach((marketData, timeframe) => {
      const stats = this.calculateMedianStats(marketData);
      charts[timeframe] = this.buildChart(stats, timeframe);
    });

    return charts;
  }

  private calculateMedianStats(data: MarketData) {
    const timeMap = new Map<number, { vzo: number[]; price: number[] }>();

    if (!data.data || data.data.length === 0) return { dates: [], vzo: [], price: [], counts: [] };

    for (const coin of data.data) {
      if (!coin.candles || coin.candles.length < 14) continue;

      for (const c of coin.candles) {
        // 🔥 ТЕПЕРЬ БЕРЕМ ИЗ PIPELINE (Гарантированно верные данные)
        const vzoVal = (c as any).vzo;

        // 🔥 ФИЛЬТР "ZERO TOLERANCE"
        // 1. Отсеиваем NaN и undefined (благодаря фиксу vzo.ts они теперь там есть)
        // 2. Отсеиваем строгие нули (Math.abs < 0.0001), так как живой VZO не бывает 0.
        // Это спасет медиану от монет с нулевым объемом.
        if (vzoVal === undefined || vzoVal === null || isNaN(vzoVal) || Math.abs(vzoVal) < 0.0001)
          continue;

        const time = c.openTime;
        if (!timeMap.has(time)) {
          timeMap.set(time, { vzo: [], price: [] });
        }

        const entry = timeMap.get(time)!;
        entry.vzo.push(vzoVal);

        const priceVal = (c as any).closePriceNorm ?? (c as any).normalizedClose;
        if (priceVal !== undefined && priceVal !== null && !isNaN(priceVal)) {
          entry.price.push(priceVal);
        }
      }
    }

    // Сортировка
    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

    const result = {
      dates: [] as string[],
      vzo: [] as any[],
      price: [] as (number | null)[],
      counts: [] as number[],
    };

    const fmt = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const t of sortedTimes) {
      const entry = timeMap.get(t)!;

      // Рисуем точку, только если есть данные хотя бы по 1 монете
      if (entry.vzo.length > 0) {
        result.dates.push(fmt.format(new Date(t)));

        const medVal = this.getMedian(entry.vzo);
        const count = entry.vzo.length;

        // Сохраняем значение и кол-во монет для тултипа
        result.vzo.push({ value: medVal, coinCount: count });
        result.counts.push(count);

        if (entry.price.length > 0) {
          result.price.push(this.getMedian(entry.price));
        } else {
          result.price.push(null);
        }
      }
    }

    return result;
  }

  private getMedian(values: number[]): number {
    // Доп. защита (хотя мы уже отфильтровали выше)
    const clean = values.filter((v) => !isNaN(v));
    if (clean.length === 0) return 0;

    clean.sort((a, b) => a - b);
    const mid = Math.floor(clean.length / 2);
    const med = clean.length % 2 !== 0 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
    return parseFloat(med.toFixed(2));
  }

  private buildChart(data: any, tf: string): EChartsOption {
    if (data.vzo.length === 0) {
      return {
        title: {
          text: `No Data (${tf})`,
          left: 'center',
          top: 'center',
          textStyle: { color: '#666' },
        },
      };
    }

    return {
      backgroundColor: 'transparent',
      title: {
        show: false,
        text: `VZO Median (${tf})`,
        left: 'center',
        textStyle: { color: '#888', fontSize: 12 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(20, 20, 25, 0.95)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          let res = `<b>${params[0].axisValue}</b><br/>`;
          params.forEach((p: any) => {
            const val = p.value;
            if (p.seriesName === 'Median VZO' && p.data && p.data.coinCount) {
              res += `${p.marker} ${p.seriesName}: <b>${val}</b> <span style="color:#666; font-size:10px">(n=${p.data.coinCount})</span><br/>`;
            } else {
              res += `${p.marker} ${p.seriesName}: <b>${val}</b><br/>`;
            }
          });
          return res;
        },
      },
      legend: {
        data: ['Median VZO', 'Market Price'],
        top: 20,
        left: 'center',
        textStyle: { color: '#ccc', fontSize: 10 },
      },
      grid: { left: '3%', right: '3%', bottom: '5%', top: '15%', containLabel: true },
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
      xAxis: {
        type: 'category',
        data: data.dates,
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: { color: '#888' },
      },
      yAxis: [
        {
          type: 'value',
          scale: true,
          splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
          axisLabel: { color: '#888' },
          name: 'VZO',
          min: -60,
          max: 60,
        },
        {
          type: 'value',
          scale: true,
          splitLine: { show: false },
          axisLabel: { show: false },
          position: 'right',
        },
      ],
      series: [
        {
          name: 'Median VZO',
          type: 'line',
          yAxisIndex: 0,
          data: data.vzo,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#00e676' },
          markLine: {
            symbol: 'none',
            label: { show: false },
            lineStyle: { type: 'dashed', opacity: 0.5 },
            data: [
              { yAxis: 40, lineStyle: { color: '#ff1744' } },
              { yAxis: 0, lineStyle: { color: '#fff' } },
              { yAxis: -40, lineStyle: { color: '#00e676' } },
            ],
          },
        },
        {
          name: 'Market Price',
          type: 'line',
          yAxisIndex: 1,
          data: data.price,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#fff', type: 'dashed', opacity: 0.3 },
          connectNulls: true,
          z: 0,
        },
      ],
    };
  }
}
