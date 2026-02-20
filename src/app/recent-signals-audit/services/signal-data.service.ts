import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { KlineDataService } from '../../shared/services/kline-data.service';
import { MarketData, CoinMarketData, Candle } from '../../models/kline.model';
import { WorkingCoin } from '../../shared/models/working-coin.model';
import { AuditTableRow } from '../audit-table/audit-table';

export type SignalType =
    // EMA Crossovers
    | 'ema50crossedUp'
    | 'ema50crossedDown'
    | 'ema100crossedUp'
    | 'ema100crossedDown'
    | 'ema150crossedUp'
    | 'ema150crossedDown'
    // KAMA Crossovers
    | 'kamaCrossedUp'
    | 'kamaCrossedDown'
    // Breakout Signals
    | 'highest50crossedUp'
    | 'lowest50crossedDown'
    | 'highest100crossedUp'
    | 'lowest100crossedDown'
    // Price Action Patterns
    | 'doji'
    | 'bullishEngulfing'
    | 'bearishEngulfing'
    | 'hammer'
    | 'pinbar'
    // RVWAP Crossovers
    | 'rvwapCrossedUp'
    | 'rvwapCrossedDown'
    | 'rvwapUpperBand1CrossedUp'
    | 'rvwapUpperBand1CrossedDown'
    | 'rvwapUpperBand2CrossedUp'
    | 'rvwapUpperBand2CrossedDown'
    | 'rvwapLowerBand1CrossedUp'
    | 'rvwapLowerBand1CrossedDown'
    | 'rvwapLowerBand2CrossedUp'
    | 'rvwapLowerBand2CrossedDown'
    // Breaking Ice (EMA Fan Punches)
    | 'bullishPunch'
    | 'bearishPunch'
    // RVWAP-RSI Divergence
    | 'bullishRvwapRsiDivergence'
    | 'bearishRvwapRsiDivergence'
    // RVWAP-VZO Divergence
    | 'bullishRvwapVzoDivergence'
    | 'bearishRvwapVzoDivergence'
    // RVWAP-CMF Divergence
    | 'bullishRvwapCmfDivergence'
    | 'bearishRvwapCmfDivergence'
    // Order Flow Regime
    | 'longAccumulation'
    | 'shortAccumulation'
    | 'longLiquidation'
    | 'shortCovering'
    // RVWAP Momentum Reversal
    | 'topReversalRisk'
    | 'bottomReversalChance'
    // CMF Slope Change
    | 'cmfSlopeUp'
    | 'cmfSlopeDown'
    // Market Regime
    | 'trendingRegimeStart'
    | 'meanReversionRegimeStart'
    // Volatility Exhaustion
    | 'volatilityExhaustion'
    // Skew Reversal
    | 'bullishSkewReversal'
    | 'bearishSkewReversal';

export type Timeframe = '1h' | '4h' | '8h' | '12h' | '1d';

/**
 * Service for extracting signal data from IndexedDB
 * Analyzes candle data and finds coins that triggered specific signals
 */
@Injectable({
    providedIn: 'root',
})
export class SignalDataService {
    private klineService = inject(KlineDataService);

    /**
     * Get signal data for a specific timeframe
     * Returns last 20 candles where the signal occurred with coins that triggered it
     */
    public getSignalData(
        signalType: SignalType,
        timeframe: Timeframe
    ): Observable<AuditTableRow[]> {
        // Map '1d' to 'D' for KlineDataService compatibility
        const klineTimeframe = this.mapTimeframe(timeframe);

        return from(this.klineService.getKlines(klineTimeframe as any)).pipe(
            map((marketData) => {
                if (!marketData || !marketData.data) {
                    console.warn(`No market data for ${timeframe}`);
                    return [];
                }

                return this.extractSignalRows(marketData, signalType);
            })
        );
    }

    /**
     * Map audit timeframe to KlineDataService timeframe
     * '1d' → 'D' for compatibility with backend
     */
    private mapTimeframe(timeframe: Timeframe): string {
        return timeframe === '1d' ? 'D' : timeframe;
    }

    /**
     * Extract rows where signal occurred
     * Groups coins by candle openTime where they triggered the signal
     */
    private extractSignalRows(
        marketData: MarketData,
        signalType: SignalType
    ): AuditTableRow[] {
        // Map: openTime -> coins that triggered signal at that time
        const signalMap = new Map<number, WorkingCoin[]>();

        // Get the signal flag name from signal type
        const signalFlag = this.getSignalFlag(signalType);

        console.log(`🔍 [SignalData] Looking for signal: ${signalType}, flag: ${signalFlag}`);

        let totalCoins = 0;
        let totalCandles = 0;
        let signalsFound = 0;

        // Iterate through all coins
        for (const coinData of marketData.data) {
            totalCoins++;
            // Check each candle for this coin
            for (const candle of coinData.candles) {
                totalCandles++;
                // If this candle has the signal flag set to true
                if (candle[signalFlag] === true) {
                    signalsFound++;
                    const openTime = candle.openTime;

                    // Get or create array for this openTime
                    if (!signalMap.has(openTime)) {
                        signalMap.set(openTime, []);
                    }

                    // Add coin to this time slot
                    const workingCoin = this.coinDataToWorkingCoin(coinData);
                    signalMap.get(openTime)!.push(workingCoin);

                    // Intentionally NO break: a coin can appear in multiple rows
                    // if it triggered the signal on multiple candles (full signal history)
                }
            }
        }

        console.log(
            `🔍 [SignalData] Scanned ${totalCoins} coins, ${totalCandles} candles, found ${signalsFound} signals`
        );

        // Convert map to array and sort by time (newest first)
        const rows: AuditTableRow[] = Array.from(signalMap.entries())
            .map(([openTime, coins]) => ({
                openTime,
                coins: coins.sort((a, b) => a.symbol.localeCompare(b.symbol)), // Sort coins alphabetically
            }))
            .sort((a, b) => b.openTime - a.openTime) // Newest first
            .slice(0, 20); // Take last 20

        console.log(
            `📊 [SignalData] ${signalType} on ${marketData.timeframe}: Found ${rows.length} candles with signals, total coins: ${rows.reduce((sum, r) => sum + r.coins.length, 0)}`
        );

        return rows;
    }

    /**
     * Map signal type to candle flag property
     */
    private getSignalFlag(signalType: SignalType): keyof Candle {
        const flagMap: Record<SignalType, keyof Candle> = {
            // EMA Crossovers
            ema50crossedUp: 'isCrossedUpEma50',
            ema50crossedDown: 'isCrossedDownEma50',
            ema100crossedUp: 'isCrossedUpEma100',
            ema100crossedDown: 'isCrossedDownEma100',
            ema150crossedUp: 'isCrossedUpEma150',
            ema150crossedDown: 'isCrossedDownEma150',
            // KAMA Crossovers
            kamaCrossedUp: 'isCrossedUpKama',
            kamaCrossedDown: 'isCrossedDownKama',
            // Breakout Signals
            highest50crossedUp: 'isCrossedUpHighest50',
            lowest50crossedDown: 'isCrossedDownLowest50',
            highest100crossedUp: 'isCrossedUpHighest100',
            lowest100crossedDown: 'isCrossedDownLowest100',
            // Price Action Patterns
            doji: 'isDoji',
            bullishEngulfing: 'isBullishEngulfing',
            bearishEngulfing: 'isBearishEngulfing',
            hammer: 'isHammer',
            pinbar: 'isPinbar',
            // RVWAP Crossovers
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
            // Breaking Ice (EMA Fan Punches)
            bullishPunch: 'isBullishPunch',
            bearishPunch: 'isBearishPunch',
            // RVWAP-RSI Divergence
            bullishRvwapRsiDivergence: 'isBullishRvwapRsiDivergence',
            bearishRvwapRsiDivergence: 'isBearishRvwapRsiDivergence',
            // RVWAP-VZO Divergence
            bullishRvwapVzoDivergence: 'isBullishRvwapVzoDivergence',
            bearishRvwapVzoDivergence: 'isBearishRvwapVzoDivergence',
            // RVWAP-CMF Divergence
            bullishRvwapCmfDivergence: 'isBullishRvwapCmfDivergence',
            bearishRvwapCmfDivergence: 'isBearishRvwapCmfDivergence',
            // Order Flow Regime
            longAccumulation: 'isLongAccumulation',
            shortAccumulation: 'isShortAccumulation',
            longLiquidation: 'isLongLiquidation',
            shortCovering: 'isShortCovering',
            // RVWAP Momentum Reversal
            topReversalRisk: 'isTopReversalRisk',
            bottomReversalChance: 'isBottomReversalChance',
            // CMF Slope Change
            cmfSlopeUp: 'isCmfSlopeUp',
            cmfSlopeDown: 'isCmfSlopeDown',
            // Market Regime
            trendingRegimeStart: 'isTrendingRegimeStart',
            meanReversionRegimeStart: 'isMeanReversionRegimeStart',
            // Volatility Exhaustion
            volatilityExhaustion: 'isVolatilityExhaustion',
            // Skew Reversal
            bullishSkewReversal: 'isBullishSkewReversal',
            bearishSkewReversal: 'isBearishSkewReversal',
        };

        return flagMap[signalType];
    }

    /**
     * Convert CoinMarketData to WorkingCoin format
     */
    private coinDataToWorkingCoin(coinData: CoinMarketData): WorkingCoin {
        return {
            symbol: coinData.symbol,
            logoUrl: `${coinData.symbol.toLowerCase()}.png`, // Adjust as needed
            category: coinData.category,
            categoryStr: this.getCategoryString(coinData.category),
            exchanges: coinData.exchanges,
            btc_corr_1d_w30: coinData.btc_corr_1d_w30,
        } as WorkingCoin;
    }

    /**
     * Map category number to string
     */
    private getCategoryString(category: number): string {
        const categoryMap: Record<number, string> = {
            1: 'L1',
            2: 'L2',
            3: 'DeFi',
            4: 'Meme',
            5: 'AI',
            6: 'Gaming',
            7: 'Other',
        };
        return categoryMap[category] || 'Unknown';
    }
}
