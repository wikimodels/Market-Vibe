import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData, Candle } from '../../models/kline.model';

@Injectable({
  providedIn: 'root',
})
export class CmfRegimeService {
  private readonly WARMUP = 20; // Стандартный период CMF

  public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
    const charts: Record<string, EChartsOption> = {};

    allMarketData.forEach((marketData, timeframe) => {
      const stats = this.calculateCmfStats(marketData);
      charts[timeframe] = this.buildChart(stats, timeframe);
    });

    return charts;
  }

  private calculateCmfStats(data: MarketData) {
    // Map: Time -> { inflow, outflow, neutral, totalScanned }
    const timeMap = new Map<
      number,
      { inflow: number; outflow: number; neutral: number; totalScanned: number }
    >();

    if (!data.data || data.data.length === 0) {
      return { dates: [], inflow: [], outflow: [], neutral: [], totalScanned: [] };
    }

    for (const coin of data.data) {
      if (!coin.candles || coin.candles.length < this.WARMUP) continue;

      // --- ЛОГИКА FALLBACK ---
      // Проверяем последнюю свечу: есть ли там готовый CMF?
      // Если нет, считаем массив CMF локально для всей монеты.
      const lastCandle = coin.candles[coin.candles.length - 1] as any;
      const hasPipelineCmf = lastCandle.cmf !== undefined && lastCandle.cmf !== null;

      let localCmf: number[] = [];
      if (!hasPipelineCmf) {
        localCmf = this.calculateRollingCmf(coin.candles, this.WARMUP);
      }

      for (let i = 0; i < coin.candles.length; i++) {
        // Если считаем локально, пропускаем период разгона
        if (!hasPipelineCmf && i < this.WARMUP) continue;

        const c = coin.candles[i];
        const time = c.openTime;

        if (!timeMap.has(time)) {
          timeMap.set(time, { inflow: 0, outflow: 0, neutral: 0, totalScanned: 0 });
        }
        const counts = timeMap.get(time)!;

        // Получаем значение: либо из пайплайна, либо из локального расчета
        const val = hasPipelineCmf ? (c as any).cmf : localCmf[i];

        // Строгая проверка валидности числа
        if (typeof val !== 'number' || isNaN(val)) continue;

        counts.totalScanned++;

        if (val > 0) {
          counts.inflow++;
        } else if (val < 0) {
          counts.outflow++;
        } else {
          // CMF ровно 0 (редко, но бывает при отсутствии объема/движения)
          counts.neutral++;
        }
      }
    }

    // Сортировка
    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

    const result = {
      dates: [] as string[],
      inflow: [] as number[],
      outflow: [] as number[],
      neutral: [] as number[], // Добавил для полноты картины (опционально)
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
      result.dates.push(fmt.format(new Date(t)));

      result.inflow.push(counts.inflow);
      result.outflow.push(counts.outflow);
      result.neutral.push(counts.neutral);
      result.totalScanned.push(counts.totalScanned);
    }

    return result;
  }

  // --- Локальный расчет CMF (классическая формула) ---
  private calculateRollingCmf(candles: Candle[], length: number): number[] {
    const len = candles.length;
    const cmfData = new Array(len).fill(NaN);

    // Массивы для Money Flow Volume и Volume
    const mfv = new Array(len).fill(0);
    const vol = new Array(len).fill(0);

    for (let i = 0; i < len; i++) {
      const h = Number(candles[i].highPrice);
      const l = Number(candles[i].lowPrice);
      const c = Number(candles[i].closePrice);
      const v = Number(candles[i].volume);

      vol[i] = v;

      if (h === l) {
        mfv[i] = 0;
      } else {
        // Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
        const mul = (c - l - (h - c)) / (h - l);
        mfv[i] = mul * v;
      }
    }

    // Rolling Sum
    for (let i = length - 1; i < len; i++) {
      let sumMfv = 0;
      let sumVol = 0;

      for (let j = 0; j < length; j++) {
        sumMfv += mfv[i - j];
        sumVol += vol[i - j];
      }

      if (sumVol === 0) {
        cmfData[i] = 0;
      } else {
        cmfData[i] = sumMfv / sumVol;
      }
    }

    return cmfData;
  }

  private buildChart(data: any, tf: string): EChartsOption {
    if (data.dates.length === 0) {
      return {
        title: {
          text: `No CMF Data (${tf})`,
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
          const index = params[0].dataIndex;
          if (data.totalScanned && data.totalScanned[index]) {
            res += ` <span style="color:#666; font-size:10px">(n=${data.totalScanned[index]})</span>`;
          }
          res += '<br/>';

          params.forEach((p: any) => {
            if (p.value > 0) {
              res += `${p.marker} ${p.seriesName}: <b>${p.value}</b><br/>`;
            }
          });
          return res;
        },
      },
      legend: {
        data: ['Inflow (CMF > 0)', 'Outflow (CMF < 0)'],
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
        name: 'Coins Count',
      },
      series: [
        {
          name: 'Inflow (CMF > 0)',
          type: 'bar',
          stack: 'total',
          data: data.inflow,
          itemStyle: { color: '#00e676' }, // Зеленый
          emphasis: { focus: 'series' },
        },
        {
          name: 'Outflow (CMF < 0)',
          type: 'bar',
          stack: 'total',
          data: data.outflow,
          itemStyle: { color: '#ff1744' }, // Красный
          emphasis: { focus: 'series' },
        },
      ],
    };
  }
}
