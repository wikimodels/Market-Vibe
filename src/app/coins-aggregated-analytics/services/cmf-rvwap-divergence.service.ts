import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

@Injectable({
  providedIn: 'root',
})
export class CmfRvwapDivergenceService {
  // 🔥 Удален CORR_THRESHOLD

  public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
    const charts: Record<string, EChartsOption> = {};

    allMarketData.forEach((marketData, timeframe) => {
      const stats = this.calculateStats(marketData);
      charts[timeframe] = this.buildChart(stats, timeframe);
    });

    return charts;
  }

  private calculateStats(data: MarketData) {
    // Map: Time -> { bullDiv, bearDiv, totalScanned }
    const timeMap = new Map<number, { bullDiv: number; bearDiv: number; totalScanned: number }>();

    if (!data.data || data.data.length === 0) {
      return { dates: [], bullDiv: [], bearDiv: [], totalScanned: [] };
    }

    for (const coin of data.data) {
      // 1. УБРАН ФИЛЬТР КОРРЕЛЯЦИИ. Сканируем все монеты.

      if (!coin.candles) continue;

      for (const c of coin.candles) {
        const ca = c as any;
        const time = ca.openTime;

        if (!timeMap.has(time)) {
          timeMap.set(time, { bullDiv: 0, bearDiv: 0, totalScanned: 0 });
        }

        const counts = timeMap.get(time)!;

        // Проверка наличия данных в Пайплайне
        if (
          typeof ca.cmf !== 'number' ||
          isNaN(ca.cmf) ||
          typeof ca.closePrice !== 'number' ||
          typeof ca.rvwapUpperBand1 !== 'number' ||
          typeof ca.rvwapLowerBand1 !== 'number'
        ) {
          continue;
        }

        counts.totalScanned++;

        // --- ЛОГИКА ДИВЕРГЕНЦИЙ ---

        // 1. Bullish Divergence (Цена дешевая, деньги заходят)
        // CMF > 0 (Приток) AND Close < RVWAP Lower Band 1 (Дно канала)
        if (ca.cmf > 0 && ca.closePrice < ca.rvwapLowerBand1) {
          counts.bullDiv++;
        }

        // 2. Bearish Divergence (Цена дорогая, деньги выходят)
        // CMF < 0 (Отток) AND Close > RVWAP Upper Band 1 (Верх канала)
        if (ca.cmf < 0 && ca.closePrice > ca.rvwapUpperBand1) {
          counts.bearDiv++;
        }
      }
    }

    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

    const result = {
      dates: [] as string[],
      bullDiv: [] as number[],
      bearDiv: [] as number[],
      totalScanned: [] as number[],
    };

    const fmt = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const t of sortedTimes) {
      const counts = timeMap.get(t)!;
      // Показываем, если есть данные
      result.dates.push(fmt.format(new Date(t)));
      result.bullDiv.push(counts.bullDiv);
      result.bearDiv.push(counts.bearDiv);
      result.totalScanned.push(counts.totalScanned);
    }

    return result;
  }

  private buildChart(data: any, tf: string): EChartsOption {
    if (data.dates.length === 0) {
      return {
        title: {
          text: `No Divergence Data (${tf})`,
          left: 'center',
          top: 'center',
          textStyle: { color: '#666' },
        },
      };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(20, 20, 25, 0.95)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        order: 'seriesDesc',
        formatter: (params: any) => {
          let res = `<b>${params[0].axisValue}</b>`;
          // Инфо о кол-ве монет
          const index = params[0].dataIndex;
          if (data.totalScanned && data.totalScanned[index]) {
            res += ` <span style="color:#666; font-size:10px">(Scanned: ${data.totalScanned[index]})</span>`;
          }
          res += '<br/>';

          params.forEach((p: any) => {
            res += `${p.marker} ${p.seriesName}: <b>${p.value}</b><br/>`;
          });
          return res;
        },
      },
      legend: {
        data: ['Bullish Div (Cheap + Inflow)', 'Bearish Div (Expensive + Outflow)'],
        top: 0,
        left: 'center',
        textStyle: { color: '#ccc', fontSize: 11 },
        icon: 'roundRect',
        itemGap: 15,
      },
      grid: { left: '3%', right: '3%', bottom: '5%', top: '12%', containLabel: true },
      dataZoom: [{ type: 'inside', xAxisIndex: [0], start: 0, end: 100 }],
      xAxis: {
        type: 'category',
        data: data.dates,
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: { color: '#888' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
        axisLabel: { color: '#888' },
        name: 'Signals Count',
      },
      series: [
        {
          name: 'Bullish Div (Cheap + Inflow)',
          type: 'bar',
          stack: 'total',
          data: data.bullDiv,
          itemStyle: { color: '#00e676' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Bearish Div (Expensive + Outflow)',
          type: 'bar',
          stack: 'total',
          data: data.bearDiv,
          itemStyle: { color: '#ff1744' },
          emphasis: { focus: 'series' },
        },
      ],
    };
  }
}
