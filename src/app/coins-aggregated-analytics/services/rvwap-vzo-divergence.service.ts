import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

@Injectable({
  providedIn: 'root',
})
export class RvwapVzoDivergenceService {
  // Lookback = 5 свечей (анализируем микро-тренд)
  private readonly LOOKBACK = 5;

  public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
    const charts: Record<string, EChartsOption> = {};

    allMarketData.forEach((marketData, timeframe) => {
      const stats = this.calculateStats(marketData);
      charts[timeframe] = this.buildChart(stats, timeframe);
    });

    return charts;
  }

  private calculateStats(data: MarketData) {
    const timeMap = new Map<number, { bearDiv: number; bullDiv: number; totalScanned: number }>();

    if (!data.data || data.data.length === 0) {
      return { dates: [], bearDiv: [], bullDiv: [], totalScanned: [] };
    }

    for (const coin of data.data) {
      if (!coin.candles || coin.candles.length < this.LOOKBACK + 1) continue;

      for (let i = this.LOOKBACK; i < coin.candles.length; i++) {
        const c = coin.candles[i];
        const time = c.openTime;

        if (!timeMap.has(time)) {
          timeMap.set(time, { bearDiv: 0, bullDiv: 0, totalScanned: 0 });
        }
        const counts = timeMap.get(time)!;

        counts.totalScanned++;

        // Проверка данных: VZO, RVWAP Band 1
        if (
          c.rvwapUpperBand1 == null ||
          c.rvwapLowerBand1 == null ||
          c.vzo == null // <-- Используем VZO
        ) {
          continue;
        }

        // Собираем массивы для регрессии
        const prices: number[] = [];
        const vzos: number[] = [];
        let hasNulls = false;

        for (let k = 0; k < this.LOOKBACK; k++) {
          const candle = coin.candles[i - k];
          if (candle.vzo == null) {
            hasNulls = true;
            break;
          }
          prices.push(Number(candle.closePrice));
          vzos.push(Number(candle.vzo));
        }

        if (hasNulls) continue;

        // Разворачиваем для хронологии [t-4 ... t]
        prices.reverse();
        vzos.reverse();

        // СЧИТАЕМ LINREG SLOPE
        const priceSlope = this.linearRegressionSlope(prices);
        const vzoSlope = this.linearRegressionSlope(vzos);

        const upper1 = Number(c.rvwapUpperBand1);
        const lower1 = Number(c.rvwapLowerBand1);
        const high = Number(c.highPrice);
        const low = Number(c.lowPrice);
        const vzo = Number(c.vzo);

        // --- ЛОГИКА VZO SLOPE DIVERGENCE ---

        // 1. BEARISH DIV (На хаях)
        // Цена выше RVWAP Band 1
        // Цена растет (Slope > 0)
        // VZO падает (Slope < 0) — "Объем уходит"
        const isHigh = high >= upper1;
        const divBear = priceSlope > 0 && vzoSlope < 0;
        // Фильтр: VZO > 0 (мы все еще в позитивной зоне, но теряем силу)
        const vzoContext = vzo > 0;

        if (isHigh && divBear && vzoContext) {
          counts.bearDiv++;
        }

        // 2. BULLISH DIV (На дне)
        // Цена ниже RVWAP Band 1
        // Цена падает (Slope < 0)
        // VZO растет (Slope > 0) — "Объем заходит"
        const isLow = low <= lower1;
        const divBull = priceSlope < 0 && vzoSlope > 0;
        // Фильтр: VZO < 0
        const vzoContextLow = vzo < 0;

        if (isLow && divBull && vzoContextLow) {
          counts.bullDiv++;
        }
      }
    }

    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);
    const result = {
      dates: [] as string[],
      bearDiv: [] as number[],
      bullDiv: [] as number[],
      totalScanned: [] as number[],
    };
    const fmt = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const t of sortedTimes) {
      const c = timeMap.get(t)!;
      if (c.totalScanned > 0) {
        result.dates.push(fmt.format(new Date(t)));
        result.bearDiv.push(c.bearDiv);
        result.bullDiv.push(-c.bullDiv);
        result.totalScanned.push(c.totalScanned);
      }
    }
    return result;
  }

  private linearRegressionSlope(y: number[]): number {
    const n = y.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    for (let x = 0; x < n; x++) {
      const val = y[x];
      sumX += x;
      sumY += val;
      sumXY += x * val;
      sumXX += x * x;
    }
    const numerator = n * sumXY - sumX * sumY;
    const denominator = n * sumXX - sumX * sumX;
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private buildChart(data: any, tf: string): EChartsOption {
    if (data.dates.length === 0) {
      return {
        title: {
          text: `No VZO Div Data (${tf})`,
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
        formatter: (params: any) => {
          let res = `<b>${params[0].axisValue}</b>`;
          const index = params[0].dataIndex;
          if (data.totalScanned && data.totalScanned[index]) {
            res += ` <span style="color:#aaa; font-size:10px">(n=${data.totalScanned[index]})</span>`;
          }
          res += '<br/>';
          params.forEach((p: any) => {
            const val = Math.abs(p.value);
            if (val > 0) res += `${p.marker} ${p.seriesName}: <b>${val}</b><br/>`;
          });
          return res;
        },
      },
      legend: {
        data: ['Bearish VZO Div (Price↗ VZO↘)', 'Bullish VZO Div (Price↘ VZO↗)'],
        top: 0,
        left: 'center',
        textStyle: { color: '#ccc', fontSize: 11 },
      },
      grid: { left: '3%', right: '3%', bottom: '5%', top: '12%', containLabel: true },
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
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
        name: 'Coins',
      },
      series: [
        {
          name: 'Bearish VZO Div (Price↗ VZO↘)',
          type: 'bar',
          stack: 'total',
          data: data.bearDiv,
          itemStyle: { color: '#ff3d00' }, // Глубокий оранжевый/красный
        },
        {
          name: 'Bullish VZO Div (Price↘ VZO↗)',
          type: 'bar',
          stack: 'total',
          data: data.bullDiv,
          itemStyle: { color: '#00bcd4' }, // Циан/Бирюзовый
        },
      ],
    };
  }
}
