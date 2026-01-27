import { Injectable } from '@angular/core';
import { MarketData } from '../../models/kline.model';
import { SignalType } from '../../recent-signals-audit/services/signal-data.service';

@Injectable({
    providedIn: 'root',
})
export class SignalIntensityHeatmapService {
    // Все 47 сигналов из Recent Signals Audit
    private readonly SIGNAL_TYPES: SignalType[] = [
        'ema50crossedUp', 'ema50crossedDown',
        'ema100crossedUp', 'ema100crossedDown',
        'ema150crossedUp', 'ema150crossedDown',
        'kamaCrossedUp', 'kamaCrossedDown',
        'highest50crossedUp', 'lowest50crossedDown',
        'highest100crossedUp', 'lowest100crossedDown',
        'doji', 'bullishEngulfing', 'bearishEngulfing',
        'hammer', 'pinbar',
        'rvwapCrossedUp', 'rvwapCrossedDown',
        'rvwapUpperBand1CrossedUp', 'rvwapUpperBand1CrossedDown',
        'rvwapUpperBand2CrossedUp', 'rvwapUpperBand2CrossedDown',
        'rvwapLowerBand1CrossedUp', 'rvwapLowerBand1CrossedDown',
        'rvwapLowerBand2CrossedUp', 'rvwapLowerBand2CrossedDown',
        'bullishPunch', 'bearishPunch',
        'bullishRvwapRsiDivergence', 'bearishRvwapRsiDivergence',
        'bullishRvwapVzoDivergence', 'bearishRvwapVzoDivergence',
        'bullishRvwapCmfDivergence', 'bearishRvwapCmfDivergence',
        'longAccumulation', 'shortAccumulation', 'longLiquidation', 'shortCovering',
        'topReversalRisk', 'bottomReversalChance',
        'cmfSlopeUp', 'cmfSlopeDown',
        'trendingRegimeStart', 'meanReversionRegimeStart',
        'volatilityExhaustion',
        'bullishSkewReversal', 'bearishSkewReversal'
    ];

    private readonly SIGNAL_LABELS: Record<SignalType, string> = {
        ema50crossedUp: 'EMA50 ↗',
        ema50crossedDown: 'EMA50 ↘',
        ema100crossedUp: 'EMA100 ↗',
        ema100crossedDown: 'EMA100 ↘',
        ema150crossedUp: 'EMA150 ↗',
        ema150crossedDown: 'EMA150 ↘',
        kamaCrossedUp: 'KAMA ↗',
        kamaCrossedDown: 'KAMA ↘',
        highest50crossedUp: 'High50 ↗',
        lowest50crossedDown: 'Low50 ↘',
        highest100crossedUp: 'High100 ↗',
        lowest100crossedDown: 'Low100 ↘',
        doji: 'Doji',
        bullishEngulfing: 'Bull Engulf',
        bearishEngulfing: 'Bear Engulf',
        hammer: 'Hammer',
        pinbar: 'Pinbar',
        rvwapCrossedUp: 'RVWAP ↗',
        rvwapCrossedDown: 'RVWAP ↘',
        rvwapUpperBand1CrossedUp: 'RV UB1 ↗',
        rvwapUpperBand1CrossedDown: 'RV UB1 ↘',
        rvwapUpperBand2CrossedUp: 'RV UB2 ↗',
        rvwapUpperBand2CrossedDown: 'RV UB2 ↘',
        rvwapLowerBand1CrossedUp: 'RV LB1 ↗',
        rvwapLowerBand1CrossedDown: 'RV LB1 ↘',
        rvwapLowerBand2CrossedUp: 'RV LB2 ↗',
        rvwapLowerBand2CrossedDown: 'RV LB2 ↘',
        bullishPunch: 'Bull Punch',
        bearishPunch: 'Bear Punch',
        bullishRvwapRsiDivergence: 'RV-RSI Div ↗',
        bearishRvwapRsiDivergence: 'RV-RSI Div ↘',
        bullishRvwapVzoDivergence: 'RV-VZO Div ↗',
        bearishRvwapVzoDivergence: 'RV-VZO Div ↘',
        bullishRvwapCmfDivergence: 'RV-CMF Div ↗',
        bearishRvwapCmfDivergence: 'RV-CMF Div ↘',
        longAccumulation: 'Long Acc',
        shortAccumulation: 'Short Acc',
        longLiquidation: 'Long Liq',
        shortCovering: 'Short Cover',
        topReversalRisk: 'Top Rev Risk',
        bottomReversalChance: 'Bottom Rev Risk',
        cmfSlopeUp: 'CMF ↗',
        cmfSlopeDown: 'CMF ↘',
        trendingRegimeStart: 'Trend Start',
        meanReversionRegimeStart: 'MeanRev Start',
        volatilityExhaustion: 'Vol Exhaust',
        bullishSkewReversal: 'Skew Rev ↗',
        bearishSkewReversal: 'Skew Rev ↘',
    };

    public getWidgetData(allMarketData: Map<string, MarketData>): Record<string, any> {
        const data: Record<string, any> = {};

        allMarketData.forEach((marketData, timeframe) => {
            data[timeframe] = this.calculateHeatmapData(marketData);
        });

        return data;
    }

    private calculateHeatmapData(marketData: MarketData) {
        if (!marketData.data || marketData.data.length === 0) {
            return { signals: [], rawData: [], normalizedData: [], yAxis: [], timestamps: [] };
        }

        const result: {
            signals: SignalType[];
            rawData: number[][];
            normalizedData: number[][];
            yAxis: string[];
            timestamps: number[]; // Временные метки для заголовков
        } = {
            signals: [],
            rawData: [],
            normalizedData: [],
            yAxis: [],
            timestamps: [],
        };

        // Получаем временные метки из первого сигнала
        let allTimestamps: number[] = [];
        if (marketData.data.length > 0 && marketData.data[0].candles) {
            allTimestamps = marketData.data[0].candles.map(c => c.openTime).sort((a, b) => a - b);
        }

        // Берём последние 20 и переворачиваем (новые слева)
        const last20Timestamps = allTimestamps.slice(-20).reverse();
        result.timestamps = last20Timestamps;

        // Для каждого сигнала
        for (const signalType of this.SIGNAL_TYPES) {
            const signalData = this.getSignalTimeSeries(marketData, signalType);

            // Если нет данных вообще, создаём массив нулей
            const timeSeries = signalData.length > 0 ? signalData : new Array(20).fill(0);

            // Берём последние 20 свечей
            const last20 = timeSeries.slice(-20);

            // Дополняем нулями если меньше 20
            while (last20.length < 20) {
                last20.unshift(0);
            }

            // Вычисляем исторический максимум
            const historicalMax = Math.max(...timeSeries, 1);

            // Нормализуем для цвета фона
            const normalized = last20.map((count: number) => {
                if (count === 0) return 0;
                return (count / historicalMax) * 100;
            });

            result.signals.push(signalType);
            result.rawData.push(last20.reverse()); // Новые свечи слева
            result.normalizedData.push(normalized.reverse()); // Новые свечи слева
            result.yAxis.push(this.SIGNAL_LABELS[signalType]);
        }

        console.log(`📊 [Heatmap] Processed ${result.signals.length} signals for ${marketData.timeframe}`);

        return result;
    }

    private getSignalTimeSeries(data: MarketData, signalType: SignalType): number[] {
        const timeMap = new Map<number, number>();

        const flagName = this.getFlagName(signalType);
        if (!flagName) return [];

        for (const coin of data.data) {
            if (!coin.candles) continue;

            for (const candle of coin.candles) {
                const time = candle.openTime;
                const c = candle as any;

                if (!timeMap.has(time)) {
                    timeMap.set(time, 0);
                }

                if (c[flagName] === true) {
                    timeMap.set(time, timeMap.get(time)! + 1);
                }
            }
        }

        const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);
        return sortedTimes.map(t => timeMap.get(t)!);
    }

    private getFlagName(signalType: SignalType): string | null {
        const flagMap: Record<SignalType, string> = {
            // EMA Crossovers - FIXED
            ema50crossedUp: 'isCrossedUpEma50',
            ema50crossedDown: 'isCrossedDownEma50',
            ema100crossedUp: 'isCrossedUpEma100',
            ema100crossedDown: 'isCrossedDownEma100',
            ema150crossedUp: 'isCrossedUpEma150',
            ema150crossedDown: 'isCrossedDownEma150',
            // KAMA Crossovers - FIXED
            kamaCrossedUp: 'isCrossedUpKama',
            kamaCrossedDown: 'isCrossedDownKama',
            // Breakout Signals - FIXED
            highest50crossedUp: 'isCrossedUpHighest50',
            lowest50crossedDown: 'isCrossedDownLowest50',
            highest100crossedUp: 'isCrossedUpHighest100',
            lowest100crossedDown: 'isCrossedDownLowest100',
            doji: 'isDoji',
            bullishEngulfing: 'isBullishEngulfing',
            bearishEngulfing: 'isBearishEngulfing',
            hammer: 'isHammer',
            pinbar: 'isPinbar',
            // RVWAP Crossovers - VERIFIED CORRECT
            rvwapCrossedUp: 'isCrossedUpRvwap',
            rvwapCrossedDown: 'isCrossedDownRvwap',
            rvwapUpperBand1CrossedUp: 'isCrossedUpRvwapUpperBand1',
            rvwapUpperBand1CrossedDown: 'isCrossedDownRvwapUpperBand1',
            rvwapUpperBand2CrossedUp: 'isCrossedUpRvwapUpperBand2',
            rvwapUpperBand2CrossedDown: 'isCrossedDownRvwapUpperBand2',
            rvwapLowerBand1CrossedUp: 'isCrossedUpRvwapLowerBand1',
            rvwapLowerBand1CrossedDown: 'isCrossedDownRvwapLowerBand1',
            rvwapLowerBand2CrossedUp: 'isCrossedUpRvwapLowerBand2',
            rvwapLowerBand2CrossedDown: 'isCrossedDownRvwapLowerBand2',
            bullishPunch: 'isBullishPunch',
            bearishPunch: 'isBearishPunch',
            bullishRvwapRsiDivergence: 'isBullishRvwapRsiDivergence',
            bearishRvwapRsiDivergence: 'isBearishRvwapRsiDivergence',
            bullishRvwapVzoDivergence: 'isBullishRvwapVzoDivergence',
            bearishRvwapVzoDivergence: 'isBearishRvwapVzoDivergence',
            bullishRvwapCmfDivergence: 'isBullishRvwapCmfDivergence',
            bearishRvwapCmfDivergence: 'isBearishRvwapCmfDivergence',
            longAccumulation: 'isLongAccumulation',
            shortAccumulation: 'isShortAccumulation',
            longLiquidation: 'isLongLiquidation',
            shortCovering: 'isShortCovering',
            topReversalRisk: 'isTopReversalRisk',
            bottomReversalChance: 'isBottomReversalChance',
            cmfSlopeUp: 'isCmfSlopeUp',
            cmfSlopeDown: 'isCmfSlopeDown',
            trendingRegimeStart: 'isTrendingRegimeStart',
            meanReversionRegimeStart: 'isMeanReversionRegimeStart',
            volatilityExhaustion: 'isVolatilityExhaustion',
            bullishSkewReversal: 'isBullishSkewReversal',
            bearishSkewReversal: 'isBearishSkewReversal',
        };

        return flagMap[signalType];
    }
}
