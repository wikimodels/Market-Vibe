import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { MarketData } from '../../models/kline.model';

@Injectable({
    providedIn: 'root',
})
export class StatisticalRegimeService {
    public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, EChartsOption> {
        const charts: Record<string, EChartsOption> = {};

        allMarketData.forEach((marketData, timeframe) => {
            const data = this.calculateRegimeData(marketData);
            charts[timeframe] = this.buildRegimeMap(data, timeframe);
        });

        return charts;
    }

    private calculateRegimeData(data: MarketData) {
        const points: Array<{
            hurst: number;
            er: number;
            kurtosis: number;
            skewness: number;
            symbol: string;
            price: number;
        }> = [];

        if (!data.data || data.data.length === 0) {
            console.warn('⚠️ [Statistical Regime] No data available');
            return points;
        }

        console.log(`🔍 [Statistical Regime] Processing ${data.data.length} coins for ${data.timeframe}`);

        // 🔍 DEBUG: Проверяем первую монету
        if (data.data.length > 0 && data.data[0].candles && data.data[0].candles.length > 0) {
            const firstCoin = data.data[0];
            const lastCandle = firstCoin.candles[firstCoin.candles.length - 1] as any;
            console.log('🔍 [Statistical Regime] First coin sample:', {
                symbol: firstCoin.symbol,
                totalCandles: firstCoin.candles.length,
                hasHurst: lastCandle.hurst != null,
                hasER: lastCandle.efficiencyRatio != null,
                hasKurtosis: lastCandle.kurtosis != null,
                hasSkewness: lastCandle.skewness != null,
                hurst: lastCandle.hurst,
                hurstConf: lastCandle.hurstConfidence,
                er: lastCandle.efficiencyRatio,
                kurtosis: lastCandle.kurtosis,
                skewness: lastCandle.skewness,
            });
        }

        let coinsWithAllMetrics = 0;
        let coinsWithoutHurst = 0;
        let coinsWithoutER = 0;
        let coinsWithoutKurtosis = 0;
        let coinsWithoutSkewness = 0;

        // Берём последнюю свечу каждой монеты
        for (const coin of data.data) {
            if (!coin.candles || coin.candles.length === 0) continue;

            const lastCandle = coin.candles[coin.candles.length - 1] as any;

            // Детальная проверка каждой метрики
            const hasHurst = lastCandle.hurst != null && !isNaN(lastCandle.hurst);
            const hasER = lastCandle.efficiencyRatio != null && !isNaN(lastCandle.efficiencyRatio);
            const hasKurtosis = lastCandle.kurtosis != null && !isNaN(lastCandle.kurtosis);
            const hasSkewness = lastCandle.skewness != null && !isNaN(lastCandle.skewness);

            if (!hasHurst) coinsWithoutHurst++;
            if (!hasER) coinsWithoutER++;
            if (!hasKurtosis) coinsWithoutKurtosis++;
            if (!hasSkewness) coinsWithoutSkewness++;

            // Проверяем наличие всех метрик
            if (!hasHurst || !hasER || !hasKurtosis || !hasSkewness) {
                continue;
            }

            coinsWithAllMetrics++;

            points.push({
                hurst: lastCandle.hurst,
                er: lastCandle.efficiencyRatio,
                kurtosis: lastCandle.kurtosis,
                skewness: lastCandle.skewness,
                symbol: coin.symbol,
                price: Number(lastCandle.closePrice),
            });
        }

        console.log('📊 [Statistical Regime] Results:', {
            totalCoins: data.data.length,
            coinsWithAllMetrics,
            coinsWithoutHurst,
            coinsWithoutER,
            coinsWithoutKurtosis,
            coinsWithoutSkewness,
            pointsGenerated: points.length,
        });

        return points;
    }

    private buildRegimeMap(data: any[], tf: string): EChartsOption {
        if (data.length === 0) {
            return {
                title: {
                    text: `No Statistical Data (${tf})`,
                    left: 'center',
                    top: 'center',
                    textStyle: { color: '#666' },
                },
            };
        }

        // Подготовка данных для scatter
        const scatterData = data.map((point) => {
            // Размер точки зависит от абсолютного значения skewness
            const size = Math.min(Math.abs(point.skewness) * 10 + 5, 30);

            // Цвет зависит от kurtosis (холодный -> горячий)
            // Kurtosis обычно 0-10, нормализуем
            const kurtNorm = Math.min(Math.max(point.kurtosis / 10, 0), 1);

            return {
                value: [point.hurst, point.er],
                symbolSize: size,
                itemStyle: {
                    color: this.getKurtosisColor(kurtNorm),
                    opacity: 0.7,
                },
                label: {
                    show: false,
                    formatter: point.symbol,
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 10,
                        fontWeight: 700 as any, // TypeScript fix
                    },
                },
                // Данные для tooltip
                kurtosis: point.kurtosis.toFixed(2),
                skewness: point.skewness.toFixed(2),
                symbol: point.symbol,
                price: point.price.toFixed(2),
            };
        });

        return {
            backgroundColor: 'transparent',
            title: {
                text: `Market Regime Map (${tf})`,
                left: 'center',
                top: 5,
                textStyle: { color: '#ccc', fontSize: 14 },
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(20, 20, 25, 0.95)',
                borderColor: '#333',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    const d = params.data;
                    return `
            <b>${d.symbol}</b><br/>
            Price: $${d.price}<br/>
            <hr style="margin:4px 0; border-color:#444"/>
            Hurst: <b>${d.value[0].toFixed(3)}</b><br/>
            Efficiency Ratio: <b>${d.value[1].toFixed(3)}</b><br/>
            Kurtosis: <b>${d.kurtosis}</b><br/>
            Skewness: <b>${d.skewness}</b>
          `;
                },
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',
                top: '15%',
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                name: 'Hurst Exponent',
                nameLocation: 'middle',
                nameGap: 30,
                nameTextStyle: { color: '#888', fontSize: 12 },
                min: 0,
                max: 1,
                splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
                axisLine: { lineStyle: { color: '#444' } },
                axisLabel: { color: '#888' },
                // Зоны
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: ['rgba(255,0,0,0.05)', 'rgba(0,255,0,0.05)'],
                    },
                },
            },
            yAxis: {
                type: 'value',
                name: 'Efficiency Ratio',
                nameLocation: 'middle',
                nameGap: 40,
                nameTextStyle: { color: '#888', fontSize: 12 },
                min: 0,
                max: 1,
                splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
                axisLine: { lineStyle: { color: '#444' } },
                axisLabel: { color: '#888' },
            },
            // Маркировки зон
            graphic: [
                {
                    type: 'text',
                    left: '15%',
                    top: '20%',
                    style: {
                        text: 'Mean Reversion\n(Choppy)',
                        fill: '#ff6b6b',
                        fontSize: 11,
                        opacity: 0.5,
                    },
                },
                {
                    type: 'text',
                    right: '15%',
                    bottom: '20%',
                    style: {
                        text: 'Strong Trend',
                        fill: '#51cf66',
                        fontSize: 11,
                        opacity: 0.5,
                    },
                },
                {
                    type: 'line',
                    shape: {
                        x1: 0,
                        y1: 0,
                        x2: 1,
                        y2: 1,
                    },
                    style: {
                        stroke: '#666',
                        lineWidth: 1,
                        lineDash: [5, 5],
                    },
                },
            ],
            series: [
                {
                    type: 'scatter',
                    data: scatterData,
                    emphasis: {
                        focus: 'self',
                        scale: 1.5,
                    },
                },
            ],
            // Легенда для цветов
            visualMap: {
                show: true,
                min: 0,
                max: 1,
                text: ['High Vol', 'Low Vol'],
                textStyle: { color: '#888' },
                inRange: {
                    color: ['#4dabf7', '#ffd43b', '#ff6b6b'],
                },
                left: 'right',
                top: 'middle',
                orient: 'vertical',
            },
        };
    }

    private getKurtosisColor(normalized: number): string {
        // Градиент: синий (низкая волатильность) -> жёлтый -> красный (высокая)
        if (normalized < 0.33) {
            // Синий -> Жёлтый
            const t = normalized / 0.33;
            return this.interpolateColor('#4dabf7', '#ffd43b', t);
        } else if (normalized < 0.67) {
            // Жёлтый -> Оранжевый
            const t = (normalized - 0.33) / 0.34;
            return this.interpolateColor('#ffd43b', '#ff922b', t);
        } else {
            // Оранжевый -> Красный
            const t = (normalized - 0.67) / 0.33;
            return this.interpolateColor('#ff922b', '#ff6b6b', t);
        }
    }

    private interpolateColor(color1: string, color2: string, t: number): string {
        const c1 = parseInt(color1.slice(1), 16);
        const c2 = parseInt(color2.slice(1), 16);

        const r1 = (c1 >> 16) & 0xff;
        const g1 = (c1 >> 8) & 0xff;
        const b1 = c1 & 0xff;

        const r2 = (c2 >> 16) & 0xff;
        const g2 = (c2 >> 8) & 0xff;
        const b2 = c2 & 0xff;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}
