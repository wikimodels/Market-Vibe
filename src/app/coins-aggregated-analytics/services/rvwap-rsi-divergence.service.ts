import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

@Injectable({
    providedIn: 'root',
})
export class RvwapRsiDivergenceService {
    // Lookback = 5 свечей для расчета наклона линии
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
            // Нужен запас истории
            if (!coin.candles || coin.candles.length < this.LOOKBACK + 1) continue;

            // Бежим по истории
            for (let i = this.LOOKBACK; i < coin.candles.length; i++) {
                const c = coin.candles[i];
                const time = c.openTime;

                if (!timeMap.has(time)) {
                    timeMap.set(time, { bearDiv: 0, bullDiv: 0, totalScanned: 0 });
                }
                const counts = timeMap.get(time)!;

                // 1. Считаем монету (n=131)
                counts.totalScanned++;

                // Проверка данных
                if (c.rvwapUpperBand1 == null || c.rvwapLowerBand1 == null || c.rsi == null) {
                    continue;
                }

                // Собираем массивы за последние 5 свечей для регрессии
                const prices: number[] = [];
                const rsis: number[] = [];
                let hasNulls = false;

                for (let k = 0; k < this.LOOKBACK; k++) {
                    const candle = coin.candles[i - k]; // i, i-1, i-2...
                    if (candle.rsi == null) {
                        hasNulls = true;
                        break;
                    }
                    prices.push(Number(candle.closePrice));
                    rsis.push(Number(candle.rsi));
                }

                if (hasNulls) continue;

                // Массивы сейчас [t, t-1, t-2...]. Для регрессии нужно [t-4, t-3... t]
                prices.reverse();
                rsis.reverse();

                // 2. СЧИТАЕМ LINREG SLOPE
                const priceSlope = this.linearRegressionSlope(prices);
                const rsiSlope = this.linearRegressionSlope(rsis);

                const upper1 = Number(c.rvwapUpperBand1);
                const lower1 = Number(c.rvwapLowerBand1);
                const high = Number(c.highPrice);
                const low = Number(c.lowPrice);
                const rsi = Number(c.rsi);

                // --- ЛОГИКА SLOPE DIVERGENCE ---

                // BEARISH: На хаях (Band 1), Цена смотрит вверх, RSI смотрит вниз
                const isHigh = high >= upper1;
                const divBear = priceSlope > 0 && rsiSlope < 0;
                // Фильтр: RSI все еще "горячий" (> 50), чтобы не ловить шум на дне
                const rsiHot = rsi > 50;

                if (isHigh && divBear && rsiHot) {
                    counts.bearDiv++;
                }

                // BULLISH: На дне (Band 1), Цена смотрит вниз, RSI смотрит вверх
                const isLow = low <= lower1;
                const divBull = priceSlope < 0 && rsiSlope > 0;
                // Фильтр: RSI "холодный" (< 50)
                const rsiCold = rsi < 50;

                if (isLow && divBull && rsiCold) {
                    counts.bullDiv++;
                }
            }
        }

        // Упаковка данных для графика (стандартная)
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

    // --- МАТЕМАТИКА ЛИНЕЙНОЙ РЕГРЕССИИ ---
    // Считает "m" в уравнении y = mx + c
    private linearRegressionSlope(y: number[]): number {
        const n = y.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (let x = 0; x < n; x++) {
            const val = y[x];
            sumX += x;
            sumY += val;
            sumXY += x * val;
            sumXX += x * x;
        }

        const numerator = n * sumXY - sumX * sumY;
        const denominator = n * sumXX - sumX * sumX;

        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    private buildChart(data: any, tf: string): EChartsOption {
        if (data.dates.length === 0) {
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
                data: ['Bearish Slope Div (Price↗ RSI↘)', 'Bullish Slope Div (Price↘ RSI↗)'],
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
                    name: 'Bearish Slope Div (Price↗ RSI↘)',
                    type: 'bar',
                    stack: 'total',
                    data: data.bearDiv,
                    itemStyle: { color: '#ff1744' }, // Ярко-красный
                },
                {
                    name: 'Bullish Slope Div (Price↘ RSI↗)',
                    type: 'bar',
                    stack: 'total',
                    data: data.bullDiv,
                    itemStyle: { color: '#00e676' }, // Ярко-зеленый
                },
            ],
        };
    }
}
