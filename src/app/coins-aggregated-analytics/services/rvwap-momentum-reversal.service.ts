import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

@Injectable({
  providedIn: 'root',
})
export class RvwapMomentumReversalService {
  // RVWAP и MACD требуют разгона. Если свечей меньше, индикаторы будут некорректны.
  private readonly WARMUP_INDEX = 35;

  public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
    const charts: Record<string, EChartsOption> = {};

    allMarketData.forEach((marketData, timeframe) => {
      // 🔥 ДЕБАГ: Смотрим в консоль
      console.group(`🔍 RVWAP Reversal DEBUG: Timeframe ${timeframe}`);
      console.log(`Total coins in dataset: ${marketData.data.length}`);

      const stats = this.calculateStats(marketData);
      charts[timeframe] = this.buildChart(stats, timeframe);

      console.groupEnd();
    });

    return charts;
  }

  private calculateStats(data: MarketData) {
    const timeMap = new Map<
      number,
      { topRisk: number; bottomChance: number; totalScanned: number }
    >();

    // Счетчики диагностики
    let skippedShortHistory = 0;
    let skippedMissingFields = 0;
    let acceptedCoins = 0;

    if (!data.data || data.data.length === 0) {
      return { dates: [], topRisk: [], bottomChance: [], totalScanned: [] };
    }

    for (const coin of data.data) {
      // 1. Проверка истории
      if (!coin.candles || coin.candles.length <= this.WARMUP_INDEX) {
        skippedShortHistory++;
        continue;
      }

      // 2. Проверка наличия данных в последней свече (быстрый чек)
      const last = coin.candles[coin.candles.length - 1] as any;
      if (
        last.rvwapUpperBand1 === undefined ||
        last.rvwapUpperBand1 === null ||
        last.macdHistogram === undefined ||
        last.macdHistogram === null
      ) {
        skippedMissingFields++;
        // Выводим пример первой проблемной монеты
        if (skippedMissingFields === 1) {
          console.warn(
            `⚠️ [${coin.symbol}] Missing RVWAP or MACD fields! Keys:`,
            Object.keys(last),
          );
        }
        continue;
      }

      acceptedCoins++;

      for (let i = this.WARMUP_INDEX; i < coin.candles.length; i++) {
        const curr = coin.candles[i] as any;
        const prev = coin.candles[i - 1] as any;
        const time = curr.openTime;

        if (!timeMap.has(time)) {
          timeMap.set(time, { topRisk: 0, bottomChance: 0, totalScanned: 0 });
        }
        const counts = timeMap.get(time)!;

        // 1. ЧТЕНИЕ ДАННЫХ С ПРОВЕРКОЙ НА NULL
        // Используем строгое сравнение с null, чтобы не получить 0
        if (
          curr.rvwapUpperBand1 == null ||
          curr.rvwapLowerBand1 == null ||
          curr.macdHistogram == null
        )
          continue;
        if (prev.macdHistogram == null) continue;

        const price = Number(curr.closePrice);
        const upper1 = Number(curr.rvwapUpperBand1);
        const lower1 = Number(curr.rvwapLowerBand1);
        const h = Number(curr.macdHistogram);
        const hPrev = Number(prev.macdHistogram);

        // 2. ФИЛЬТР ВАЛИДНОСТИ (NaN)
        if (isNaN(price) || isNaN(upper1) || isNaN(lower1) || isNaN(h) || isNaN(hPrev)) {
          continue;
        }

        counts.totalScanned++;

        // --- ЛОГИКА СТРАТЕГИИ ---

        // 1. Top Reversal Risk
        // Цена выше верхней полосы, но гистограмма MACD падает (слабость быков)
        // h > 0 проверка важна, чтобы ловить именно затухание роста, а не падение в бездну
        const isExpensive = price > upper1;
        const isFadingBull = h > 0 && h < hPrev;

        if (isExpensive && isFadingBull) {
          counts.topRisk++;
        }

        // 2. Bottom Reversal Chance
        // Цена ниже нижней полосы, но гистограмма MACD растет (слабость медведей)
        // h < 0 проверка важна, чтобы ловить отскок со дна
        const isCheap = price < lower1;
        const isFadingBear = h < 0 && h > hPrev;

        if (isCheap && isFadingBear) {
          counts.bottomChance++;
        }
      }
    }

    // 🔥 ИТОГИ
    console.log(`✅ Accepted coins: ${acceptedCoins}`);
    console.log(`❌ Skipped (History < ${this.WARMUP_INDEX}): ${skippedShortHistory}`);
    console.log(`❌ Skipped (Missing RVWAP/MACD data): ${skippedMissingFields}`);

    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

    const result = {
      dates: [] as string[],
      topRisk: [] as number[],
      bottomChance: [] as number[],
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
      // Рисуем точку только если были валидные данные
      if (c.totalScanned > 0) {
        result.dates.push(fmt.format(new Date(t)));
        result.topRisk.push(c.topRisk);
        result.bottomChance.push(-c.bottomChance); // Отрицательные для графика вниз
        result.totalScanned.push(c.totalScanned);
      }
    }

    return result;
  }

  private buildChart(data: any, tf: string): EChartsOption {
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
            if (val > 0) {
              res += `${p.marker} ${p.seriesName}: <b>${val}</b><br/>`;
            }
          });
          return res;
        },
      },
      legend: {
        data: ['Top Reversal Risk', 'Bottom Reversal Chance'],
        top: 0,
        left: 'center',
        textStyle: { color: '#ccc' },
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
      },
      series: [
        {
          name: 'Top Reversal Risk',
          type: 'bar',
          stack: 'total',
          data: data.topRisk,
          itemStyle: { color: '#ff3d00' }, // Оранжевый
        },
        {
          name: 'Bottom Reversal Chance',
          type: 'bar',
          stack: 'total',
          data: data.bottomChance,
          itemStyle: { color: '#00e676' }, // Зеленый
        },
      ],
    };
  }
}
