import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

/**
 * VWAP Gravity Breadth — рыночный индикатор ширины.
 *
 * Для каждой свечи по времени агрегирует по всем монетам в портфеле:
 *   - gravityCount  : кол-во монет с vwapGravityPct  >= 0.70 (медвежье доминирование)
 *   - buoyancyCount : кол-во монет с vwapBuoyancyPct >= 0.70 (бычье доминирование)
 *   - neutralCount  : остальные монеты (смешанный рынок)
 *
 * Всё берётся из готовых полей candle.vwapGravityPct / candle.vwapBuoyancyPct,
 * посчитанных в IndicatorPipelineService → calculateVwapGravity(window=48).
 */
@Injectable({
  providedIn: 'root',
})
export class VwapGravityBreadthService {
  private readonly THRESHOLD = 0.70;

  public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
    const charts: Record<string, EChartsOption> = {};
    allMarketData.forEach((marketData, timeframe) => {
      charts[timeframe] = this.buildChart(marketData, timeframe);
    });
    return charts;
  }

  private buildChart(data: MarketData, tf: string): EChartsOption {
    if (!data.data || data.data.length === 0) {
      return { title: { text: `No Data (${tf})`, left: 'center', top: 'center', textStyle: { color: '#666' } } };
    }

    // ── Шаг 1: Агрегация по timestamp ────────────────────────────────────────
    const timeMap = new Map<number, { gravity: number; buoyancy: number; neutral: number; total: number }>();

    for (const coin of data.data) {
      if (!coin.candles) continue;

      for (const c of coin.candles) {
        const ca = c as any;
        // Пропускаем свечи без посчитанного индикатора
        if (ca['vwapGravityPct'] === undefined || ca['vwapGravityPct'] === null) continue;

        const t = c.openTime;
        if (!timeMap.has(t)) {
          timeMap.set(t, { gravity: 0, buoyancy: 0, neutral: 0, total: 0 });
        }

        const counts = timeMap.get(t)!;
        counts.total++;

        const grav = ca['vwapGravityPct'] as number;
        const buoy = ca['vwapBuoyancyPct'] as number;

        if (grav >= this.THRESHOLD) {
          counts.gravity++;        // ≥70% свечей ниже RVWAP → медвежье
        } else if (buoy >= this.THRESHOLD) {
          counts.buoyancy++;       // ≥70% свечей выше RVWAP → бычье
        } else {
          counts.neutral++;        // смешанный рынок
        }
      }
    }

    if (timeMap.size === 0) {
      return { title: { text: `No VWAP Gravity Data (${tf})`, left: 'center', top: 'center', textStyle: { color: '#666' } } };
    }

    // ── Шаг 2: Сортировка и упаковка ─────────────────────────────────────────
    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

    const dates: string[] = [];
    const gravityData: number[] = [];
    const buoyancyData: number[] = [];
    const neutralData: number[] = [];
    const totalData: number[] = [];

    const isDay = tf === 'D' || tf === '12h';
    const fmt = new Intl.DateTimeFormat('en-GB', {
      month: 'short', day: '2-digit',
      ...(isDay ? {} : { hour: '2-digit', minute: '2-digit' }),
    });

    for (const t of sortedTimes) {
      const counts = timeMap.get(t)!;
      dates.push(fmt.format(new Date(t)));
      gravityData.push(counts.gravity);
      buoyancyData.push(counts.buoyancy);
      neutralData.push(counts.neutral);
      totalData.push(counts.total);
    }

    // ── Шаг 3: График ────────────────────────────────────────────────────────
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(20,20,25,0.95)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          const total = totalData[idx] ?? 0;
          let res = `<b>${params[0]?.axisValue}</b> <span style="color:#666;font-size:10px">(${total} coins)</span><br/>`;
          params.forEach((p: any) => {
            const pct = total > 0 ? ((p.value / total) * 100).toFixed(0) : '0';
            res += `${p.marker} ${p.seriesName}: <b>${p.value}</b> <span style="color:#888">${pct}%</span><br/>`;
          });
          return res;
        },
      },
      legend: {
        data: ['Gravity (Bear ≥70%)', 'Neutral', 'Buoyancy (Bull ≥70%)'],
        top: 0,
        left: 'center',
        textStyle: { color: '#ccc', fontSize: 11 },
        icon: 'roundRect',
      },
      grid: { left: '3%', right: '3%', bottom: '5%', top: '15%', containLabel: true },
      dataZoom: [{ type: 'inside', xAxisIndex: [0], start: 0, end: 100 }],
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: { color: '#888', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
        axisLabel: { color: '#888' },
        name: 'Coins',
        nameTextStyle: { color: '#666', fontSize: 10 },
      },
      series: [
        {
          name: 'Gravity (Bear ≥70%)',
          type: 'bar',
          stack: 'total',
          data: gravityData,
          itemStyle: { color: '#ff4d4d' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Neutral',
          type: 'bar',
          stack: 'total',
          data: neutralData,
          itemStyle: { color: '#616161' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Buoyancy (Bull ≥70%)',
          type: 'bar',
          stack: 'total',
          data: buoyancyData,
          itemStyle: { color: '#00e676' },
          emphasis: { focus: 'series' },
        },
      ],
    };
  }
}
