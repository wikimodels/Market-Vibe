import { Injectable } from '@angular/core';

export interface StrategyConfig {
  id: string;
  title: string; // Заголовок для детальной страницы
  navLabel: string; // Короткое название для кнопок (в хабе)
  description?: string; // Описание (для тултипов или подзаголовков)
}

@Injectable({
  providedIn: 'root',
})
export class AuditStrategyService {
  // 🔥 ЕДИНЫЙ РЕЕСТР СТРАТЕГИЙ
  // Легко добавлять новые, не лазая по компонентам
  private strategies: Record<string, StrategyConfig> = {
    kama_efficiency: {
      id: 'kama_efficiency',
      navLabel: 'KAMA Efficiency',
      title: 'KAMA Efficiency Audit',
    },
    kama_cross_up: {
      id: 'kama_cross_up',
      navLabel: 'KAMA Crossed Up',
      title: 'KAMA Crossed Up Signals (Adaptive Trend)',
    },
    rvwap_div: {
      id: 'rvwap_div',
      navLabel: 'RVWAP Divergence',
      title: 'RVWAP Divergence Analysis',
    },
    volume_churn: {
      id: 'volume_churn',
      navLabel: 'Volume Churn',
      title: 'Volume Churn Patterns (Effort vs Result)',
    },
    breaking_ice: {
      id: 'breaking_ice',
      navLabel: 'Breaking Ice',
      title: 'Breaking Ice: Deep Value Support',
    },
    rsi_slope: {
      id: 'rsi_slope',
      navLabel: 'RSI Slope 1SD',
      title: 'RSI Slope Divergence (1 Standard Deviation)',
    },
    // EMA Crossover Signals
    ema50crossedUp: {
      id: 'ema50crossedUp',
      navLabel: 'EMA50 ↗',
      title: 'EMA 50 Crossed Up',
      description: 'Price crossed above EMA 50',
    },
    ema50crossedDown: {
      id: 'ema50crossedDown',
      navLabel: 'EMA50 ↘',
      title: 'EMA 50 Crossed Down',
      description: 'Price crossed below EMA 50',
    },
    ema100crossedUp: {
      id: 'ema100crossedUp',
      navLabel: 'EMA100 ↗',
      title: 'EMA 100 Crossed Up',
      description: 'Price crossed above EMA 100',
    },
    ema100crossedDown: {
      id: 'ema100crossedDown',
      navLabel: 'EMA100 ↘',
      title: 'EMA 100 Crossed Down',
      description: 'Price crossed below EMA 100',
    },
    ema150crossedUp: {
      id: 'ema150crossedUp',
      navLabel: 'EMA150 ↗',
      title: 'EMA 150 Crossed Up',
      description: 'Price crossed above EMA 150',
    },
    ema150crossedDown: {
      id: 'ema150crossedDown',
      navLabel: 'EMA150 ↘',
      title: 'EMA 150 Crossed Down',
      description: 'Price crossed below EMA 150',
    },
    // KAMA Crossover Signals
    kamaCrossedUp: {
      id: 'kamaCrossedUp',
      navLabel: 'KAMA ↗',
      title: 'KAMA Crossed Up',
      description: 'Price crossed above KAMA',
    },
    kamaCrossedDown: {
      id: 'kamaCrossedDown',
      navLabel: 'KAMA ↘',
      title: 'KAMA Crossed Down',
      description: 'Price crossed below KAMA',
    },
    // Breakout Signals
    lowest50crossedUp: {
      id: 'lowest50crossedUp',
      navLabel: 'Lowest50 ↗',
      title: 'Broke Above Lowest 50',
      description: 'Price crossed above 50-period low',
    },
    lowest50crossedDown: {
      id: 'lowest50crossedDown',
      navLabel: 'Lowest50 ↘',
      title: 'Broke Below Lowest 50',
      description: 'Price crossed below 50-period low',
    },
    lowest100crossedUp: {
      id: 'lowest100crossedUp',
      navLabel: 'Lowest100 ↗',
      title: 'Broke Above Lowest 100',
      description: 'Price crossed above 100-period low',
    },
    lowest100crossedDown: {
      id: 'lowest100crossedDown',
      navLabel: 'Lowest100 ↘',
      title: 'Broke Below Lowest 100',
      description: 'Price crossed below 100-period low',
    },
    // Price Action Patterns
    doji: {
      id: 'doji',
      navLabel: 'Doji 🕯',
      title: 'Doji Pattern',
      description: 'Indecision candle pattern',
    },
    bullishEngulfing: {
      id: 'bullishEngulfing',
      navLabel: 'Bull Engulf 📈',
      title: 'Bullish Engulfing',
      description: 'Bullish reversal pattern',
    },
    bearishEngulfing: {
      id: 'bearishEngulfing',
      navLabel: 'Bear Engulf 📉',
      title: 'Bearish Engulfing',
      description: 'Bearish reversal pattern',
    },
    hammer: {
      id: 'hammer',
      navLabel: 'Hammer 🔨',
      title: 'Hammer Pattern',
      description: 'Bullish reversal at support',
    },
    pinbar: {
      id: 'pinbar',
      navLabel: 'Pinbar 📍',
      title: 'Pin Bar',
      description: 'Rejection candle pattern',
    },
    // RVWAP Crossovers
    rvwapCrossedUp: {
      id: 'rvwapCrossedUp',
      navLabel: 'RVWAP ↗',
      title: 'RVWAP Crossed Up',
      description: 'Price crossed above RVWAP',
    },
    rvwapCrossedDown: {
      id: 'rvwapCrossedDown',
      navLabel: 'RVWAP ↘',
      title: 'RVWAP Crossed Down',
      description: 'Price crossed below RVWAP',
    },
    rvwapUpperBand1CrossedUp: {
      id: 'rvwapUpperBand1CrossedUp',
      navLabel: 'RVWAP UB1 ↗',
      title: 'RVWAP Upper Band 1 Crossed Up',
      description: 'Price crossed above RVWAP upper band 1',
    },
    rvwapUpperBand1CrossedDown: {
      id: 'rvwapUpperBand1CrossedDown',
      navLabel: 'RVWAP UB1 ↘',
      title: 'RVWAP Upper Band 1 Crossed Down',
      description: 'Price crossed below RVWAP upper band 1',
    },
    rvwapUpperBand2CrossedUp: {
      id: 'rvwapUpperBand2CrossedUp',
      navLabel: 'RVWAP UB2 ↗',
      title: 'RVWAP Upper Band 2 Crossed Up',
      description: 'Price crossed above RVWAP upper band 2',
    },
    rvwapUpperBand2CrossedDown: {
      id: 'rvwapUpperBand2CrossedDown',
      navLabel: 'RVWAP UB2 ↘',
      title: 'RVWAP Upper Band 2 Crossed Down',
      description: 'Price crossed below RVWAP upper band 2',
    },
    rvwapLowerBand1CrossedUp: {
      id: 'rvwapLowerBand1CrossedUp',
      navLabel: 'RVWAP LB1 ↗',
      title: 'RVWAP Lower Band 1 Crossed Up',
      description: 'Price crossed above RVWAP lower band 1',
    },
    rvwapLowerBand1CrossedDown: {
      id: 'rvwapLowerBand1CrossedDown',
      navLabel: 'RVWAP LB1 ↘',
      title: 'RVWAP Lower Band 1 Crossed Down',
      description: 'Price crossed below RVWAP lower band 1',
    },
    rvwapLowerBand2CrossedUp: {
      id: 'rvwapLowerBand2CrossedUp',
      navLabel: 'RVWAP LB2 ↗',
      title: 'RVWAP Lower Band 2 Crossed Up',
      description: 'Price crossed above RVWAP lower band 2',
    },
    rvwapLowerBand2CrossedDown: {
      id: 'rvwapLowerBand2CrossedDown',
      navLabel: 'RVWAP LB2 ↘',
      title: 'RVWAP Lower Band 2 Crossed Down',
      description: 'Price crossed below RVWAP lower band 2',
    },
    // Breaking Ice (EMA Fan Punches)
    bullishPunch: {
      id: 'bullishPunch',
      navLabel: 'Ice Break 🧊↗',
      title: 'Bullish Ice Break',
      description: 'Uptrend but price fell below EMA150 (deep value)',
    },
    bearishPunch: {
      id: 'bearishPunch',
      navLabel: 'Ice Break 🔥↘',
      title: 'Bearish Ice Break',
      description: 'Downtrend but price rose above EMA150 (short squeeze)',
    },
    // RVWAP-RSI Divergence
    bullishRvwapRsiDivergence: {
      id: 'bullishRvwapRsiDivergence',
      navLabel: 'RVWAP Div 📉↗',
      title: 'Bullish RVWAP-RSI Divergence',
      description: 'Price falling but RSI rising at RVWAP lower band',
    },
    bearishRvwapRsiDivergence: {
      id: 'bearishRvwapRsiDivergence',
      navLabel: 'RVWAP Div 📈↘',
      title: 'Bearish RVWAP-RSI Divergence',
      description: 'Price rising but RSI falling at RVWAP upper band',
    },
    // RVWAP-VZO Divergence
    bullishRvwapVzoDivergence: {
      id: 'bullishRvwapVzoDivergence',
      navLabel: 'VZO Div 📉↗',
      title: 'Bullish RVWAP-VZO Divergence',
      description: 'Price falling but VZO rising at RVWAP lower band (volume coming in)',
    },
    bearishRvwapVzoDivergence: {
      id: 'bearishRvwapVzoDivergence',
      navLabel: 'VZO Div 📈↘',
      title: 'Bearish RVWAP-VZO Divergence',
      description: 'Price rising but VZO falling at RVWAP upper band (volume leaving)',
    },
    // RVWAP-CMF Divergence
    bullishRvwapCmfDivergence: {
      id: 'bullishRvwapCmfDivergence',
      navLabel: 'CMF Div 📉↗',
      title: 'Bullish RVWAP-CMF Divergence',
      description: 'Price falling but CMF rising at RVWAP lower band (money flow increasing)',
    },
    bearishRvwapCmfDivergence: {
      id: 'bearishRvwapCmfDivergence',
      navLabel: 'CMF Div 📈↘',
      title: 'Bearish RVWAP-CMF Divergence',
      description: 'Price rising but CMF falling at RVWAP upper band (money flow decreasing)',
    },
    // Order Flow Regime
    longAccumulation: {
      id: 'longAccumulation',
      navLabel: 'Long Acc 🟢',
      title: 'Long Accumulation',
      description: 'Price rising + OI rising (longs opening positions)',
    },
    shortAccumulation: {
      id: 'shortAccumulation',
      navLabel: 'Short Acc 🔴',
      title: 'Short Accumulation',
      description: 'Price falling + OI rising (shorts opening positions)',
    },
    longLiquidation: {
      id: 'longLiquidation',
      navLabel: 'Long Liq 🟠',
      title: 'Long Liquidation',
      description: 'Price falling + OI falling (longs being liquidated)',
    },
    shortCovering: {
      id: 'shortCovering',
      navLabel: 'Short Cover 🔵',
      title: 'Short Covering',
      description: 'Price rising + OI falling (shorts closing positions)',
    },
    // RVWAP Momentum Reversal
    topReversalRisk: {
      id: 'topReversalRisk',
      navLabel: 'Top Risk 🔴',
      title: 'Top Reversal Risk',
      description: 'Price above RVWAP upper band but MACD weakening (bulls fading)',
    },
    bottomReversalChance: {
      id: 'bottomReversalChance',
      navLabel: 'Bottom Chance 🟢',
      title: 'Bottom Reversal Chance',
      description: 'Price below RVWAP lower band but MACD strengthening (bears fading)',
    },
    // CMF Slope Change
    cmfSlopeUp: {
      id: 'cmfSlopeUp',
      navLabel: 'CMF ↗',
      title: 'CMF Slope Turning Up',
      description: 'Money flow slope changing from negative to positive (strengthening inflow)',
    },
    cmfSlopeDown: {
      id: 'cmfSlopeDown',
      navLabel: 'CMF ↘',
      title: 'CMF Slope Turning Down',
      description: 'Money flow slope changing from positive to negative (strengthening outflow)',
    },
    // Market Regime
    trendingRegimeStart: {
      id: 'trendingRegimeStart',
      navLabel: 'Trend Start 📈',
      title: 'Trending Regime Start',
      description: 'Hurst crosses 0.5 upward + Efficiency Ratio rising (trend forming)',
    },
    meanReversionRegimeStart: {
      id: 'meanReversionRegimeStart',
      navLabel: 'MeanRev Start ↔️',
      title: 'Mean Reversion Regime Start',
      description: 'Hurst crosses 0.5 downward + Efficiency Ratio falling (sideways market)',
    },
    // Volatility Exhaustion
    volatilityExhaustion: {
      id: 'volatilityExhaustion',
      navLabel: 'Vol Exhaust 💥',
      title: 'Volatility Exhaustion',
      description: 'High Kurtosis peaking and falling + trend losing steam (reversal signal)',
    },
    // Skew Reversal
    bullishSkewReversal: {
      id: 'bullishSkewReversal',
      navLabel: 'Skew Rev ⬆️',
      title: 'Bullish Skew Reversal',
      description: 'Extreme negative skew at RVWAP lower band (oversold, bounce likely)',
    },
    bearishSkewReversal: {
      id: 'bearishSkewReversal',
      navLabel: 'Skew Rev ⬇️',
      title: 'Bearish Skew Reversal',
      description: 'Extreme positive skew at RVWAP upper band (overbought, pullback likely)',
    },
  };

  /**
   * Получить конфиг по ID.
   * Если ID не найден, возвращает заглушку.
   */
  public getConfig(id: string): StrategyConfig {
    return (
      this.strategies[id] || {
        id,
        navLabel: id,
        title: `Unknown Strategy: ${id}`,
      }
    );
  }

  /**
   * Получить список всех стратегий (например, для отрисовки меню)
   */
  public getAllStrategies(): StrategyConfig[] {
    return Object.values(this.strategies);
  }
}
