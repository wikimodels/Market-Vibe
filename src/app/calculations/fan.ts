import { PriceSeries } from '../models/kline.model';

/**
 * Рассчитывает состояния "Веера EMA" (EMA Fan), "Панчи" (Punches) и "Беспорядочного Веера" (Mess Fan).
 *
 * @param ema50Series Массив значений EMA(50).
 * @param ema100Series Массив значений EMA(100).
 * @param ema150Series Массив значений EMA(150).
 * @param highPrices Массив High цен (для "Панчей").
 * @param lowPrices Массив Low цен (для "Панчей").
 * @returns Объект с 5 массивами: ...Fan и ...Punch (boolean[]).
 */
export function calculateEmaFan(
  ema50Series: number[],
  ema100Series: number[],
  ema150Series: number[],
  closePrices: number[]
) {
  const arrayLength = ema50Series.length;
  const isBullishFan: boolean[] = new Array(arrayLength).fill(false);
  const isBearishFan: boolean[] = new Array(arrayLength).fill(false);
  const isMessFan: boolean[] = new Array(arrayLength).fill(false);
  const isBullishPunch: boolean[] = new Array(arrayLength).fill(false);
  const isBearishPunch: boolean[] = new Array(arrayLength).fill(false);

  for (let i = 0; i < arrayLength; i++) {
    const ema50 = ema50Series[i];
    const ema100 = ema100Series[i];
    const ema150 = ema150Series[i];
    const close = closePrices[i];

    if (
      Number.isNaN(ema50) ||
      Number.isNaN(ema100) ||
      Number.isNaN(ema150) ||
      Number.isNaN(close)
    ) {
      continue;
    }

    const bullishFan = ema50 > ema100 && ema100 > ema150;
    const bearishFan = ema50 < ema100 && ema100 < ema150;

    isBullishFan[i] = bullishFan;
    isBearishFan[i] = bearishFan;
    isMessFan[i] = !bullishFan && !bearishFan;

    // "Breaking Ice" Logic: Close Penetration of EMA 150
    // Bullish: Fan Up (Trend Up) but Price Closes Below EMA 150 (Deep Pullback)
    isBullishPunch[i] = bullishFan && close < ema150;

    // Bearish: Fan Down (Trend Down) but Price Closes Above EMA 150 (Deep Rally/Squeeze)
    isBearishPunch[i] = bearishFan && close > ema150;
  }

  return {
    isBullishFan,
    isBearishFan,
    isMessFan,
    isBullishPunch,
    isBearishPunch,
  };
}
