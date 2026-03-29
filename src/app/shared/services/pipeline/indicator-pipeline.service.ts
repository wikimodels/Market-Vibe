import { Injectable, inject } from '@angular/core';
import { calculateADX } from '../../../calculations/adx';
import { calculateAnchoredVWAP } from '../../../calculations/anvwap';
import { calculateBollingerBands } from '../../../calculations/bollinger';
import { analyzeBreakouts } from '../../../calculations/breakout';
import { calculateCHV } from '../../../calculations/chv';
import { calculateCMF } from '../../../calculations/cmf';
import { calculateEmaFan } from '../../../calculations/fan';
import { calculateKAMA } from '../../../calculations/kama';
import { calculateEMA } from '../../../calculations/ma';
import { calculateMACD } from '../../../calculations/macd';
import { calculateOBV } from '../../../calculations/obv';
import { recognizeCandlePatterns } from '../../../calculations/patterns';
import {
  calculateLowestLow,
  calculateHighestHigh,
  calculatePriceNormalization,
} from '../../../calculations/rolling-max-min';
import { calculateRSI } from '../../../calculations/rsi';
// 🔥 ВАЖНО: Импортируем все 3 функции для RVWAP
import {
  calculateRVWAP,
  analyzeRvwapBands,
  analyzeRvwapCrosses,
} from '../../../calculations/rvwap';
import { calculateSlope } from '../../../calculations/slope';
import { analyzeLineStates } from '../../../calculations/states';
import { calculateVZO } from '../../../calculations/vzo';
import { calculateZScore } from '../../../calculations/z-score';
import { Candle, MarketData, PriceSeries } from '../../../models/kline.model';
import { calculateRollingHurst } from '../../../calculations/hurst';
import { calculateRollingKurtosis } from '../../../calculations/kurtosis';
import { calculateRollingSkewness } from '../../../calculations/skewness';
import { calculateEfficiencyRatio } from '../../../calculations/efficiency';
import { calculateAdxDensity } from '../../../calculations/adx-density';
import { calculateDiPlusDominance } from '../../../calculations/di-dominance';
import { CoinsDataService } from '../coin-data.service';
import { calculateRollingNormalization } from '../../../calculations/calculate-rolling-normalization';
import { analyzeRvwapRsiDivergence } from '../../../calculations/rvwap-rsi-divergence';
import { analyzeRvwapVzoDivergence } from '../../../calculations/rvwap-vzo-divergence';
import { analyzeRvwapCmfDivergence } from '../../../calculations/rvwap-cmf-divergence';
import { analyzeOrderFlowRegime } from '../../../calculations/order-flow-regime';
import { analyzeRvwapMomentumReversal } from '../../../calculations/rvwap-momentum-reversal';
import { analyzeCmfSlopeChange } from '../../../calculations/cmf-slope-change';
import { analyzeMarketRegimeChange } from '../../../calculations/market-regime-change';
import { analyzeVolatilityExhaustion } from '../../../calculations/volatility-exhaustion';
import { analyzeSkewReversal } from '../../../calculations/skew-reversal';

// Интерфейс для динамического расширения свойств свечи
interface CandleWithIndicators extends Candle {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class IndicatorPipelineService {
  private coinsService = inject(CoinsDataService);

  constructor() {
    console.log('✅ IndicatorPipelineService initialized');
  }

  public async process(data: MarketData): Promise<MarketData> {
    await this.coinsService.init();
    const allCoins = this.coinsService.getCurrentCoins();

    for (const coin of data.data) {
      const coinInfo = allCoins.find((c) => c.symbol === coin.symbol);
      if (coinInfo) {
        coin.btc_corr_1d_w30 = coinInfo.btc_corr_1d_w30;
      }

      const closePrices = coin.candles.map((c) => c.closePrice);

      const priceSeries: PriceSeries = {
        openTime: coin.candles.map((c) => c.openTime),
        openPrice: coin.candles.map((c) => c.openPrice),
        highPrice: coin.candles.map((c) => c.highPrice),
        lowPrice: coin.candles.map((c) => c.lowPrice),
        closePrice: closePrices,
        volume: coin.candles.map((c) => c.volume),
        timeframe: data.timeframe,
        openInterest: coin.candles.map((c) => c.openInterest ?? NaN),
        fundingRate: coin.candles.map((c) => c.fundingRate ?? NaN),
        volumeDelta: coin.candles.map((c) => c.volumeDelta ?? NaN),
      };

      // --- 1. РАСЧЁТ БАЗОВЫХ ИНДИКАТОРОВ ---
      const ema50Values = calculateEMA(closePrices, 50);
      const ema100Values = calculateEMA(closePrices, 100);
      const ema150Values = calculateEMA(closePrices, 150);

      const normResult = calculatePriceNormalization(priceSeries, 50);

      const tfStr = data.timeframe as string;
      const shortHistoryWindow = tfStr === 'D' || tfStr === '1d' ? 20 : 50;
      const volumeWindow = 50;

      const normVolume = calculateRollingNormalization(priceSeries.volume, volumeWindow);
      const normVolumeDelta = calculateRollingNormalization(
        priceSeries.volumeDelta || [],
        volumeWindow,
      );
      const normOI = calculateRollingNormalization(
        priceSeries.openInterest || [],
        shortHistoryWindow,
      );
      const normFunding = calculateRollingNormalization(
        priceSeries.fundingRate || [],
        shortHistoryWindow,
      );

      const adxResult = calculateADX(priceSeries, 14);
      const wAvwapResult = calculateAnchoredVWAP(priceSeries, 'W');
      const mAvwapResult = calculateAnchoredVWAP(priceSeries, 'M');
      const bbResult = calculateBollingerBands(priceSeries, 20, 2.0);
      const chvResult = calculateCHV(priceSeries, 10, 10);
      const cmfResult = calculateCMF(priceSeries, 20);
      const macdResult = calculateMACD(priceSeries, 12, 26, 9);
      const rsiResult = calculateRSI(priceSeries, 10);
      const obvResult = calculateOBV(priceSeries);

      // --- 2. RVWAP И ЕГО КОМПОНЕНТЫ ---

      // А. Расчет значений (Values)
      // Вход: [1.0, 2.0]. В rvwap.ts ключи преобразуются через String(mult), поэтому ключи будут '1' и '2'.
      const rVwwapResult = calculateRVWAP(priceSeries, [1.0, 2.0]);

      // Б. Анализ Полос (Regime / Bands States)
      // Исправлено: используем ключи '..._1' и '..._2', а не '_1_0'
      const rvwapBandsAnalysis = analyzeRvwapBands(
        closePrices,
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1'],
        rVwwapResult['rvwap_upper_band_2'],
        rVwwapResult['rvwap_lower_band_2'],
      );

      // В. Анализ Пересечений (Crosses / Impulses)
      // Полный анализ всех 5 линий в обе стороны (10 метрик)
      const rvwapCrossAnalysis = analyzeRvwapCrosses(
        closePrices,
        rVwwapResult['rvwap'],
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1'],
        rVwwapResult['rvwap_upper_band_2'],
        rVwwapResult['rvwap_lower_band_2'],
      );

      // --- 3. ОСТАЛЬНЫЕ ИНДИКАТОРЫ ---
      const kamaResult = calculateKAMA(priceSeries, 10, 2, 30);
      const patternResult = recognizeCandlePatterns(priceSeries);
      const lowestLowResult = calculateLowestLow(priceSeries, [50, 100]);
      const highestHighResult = calculateHighestHigh(priceSeries, [50, 100]);
      const vzoResult = calculateVZO(priceSeries);

      // --- 4. Z-SCORES ---
      const zScoreClose = calculateZScore(priceSeries.closePrice, 50);
      const zScoreVolume = calculateZScore(priceSeries.volume, 50);
      const zScoreVolDelta = calculateZScore(priceSeries.volumeDelta || [], 50);
      const zScoreFunding = calculateZScore(priceSeries.fundingRate || [], 50);
      const zScoreOI = calculateZScore(priceSeries.openInterest || [], shortHistoryWindow);

      // --- 5. STATS & MATH ---
      const kurtosis100 = calculateRollingKurtosis(priceSeries, 100);

      // Адаптивное окно для Hurst в зависимости от количества свечей
      // Hurst требует много данных для надёжного расчёта
      const candleCount = coin.candles.length;
      let hurstWindow = 400; // По умолчанию для 1h

      if (candleCount < 500) {
        // Для старших таймфреймов (4h+) используем меньшее окно
        hurstWindow = Math.max(Math.floor(candleCount * 0.6), 200);
      }

      const hurst = calculateRollingHurst(priceSeries, hurstWindow);

      const skewness50 = calculateRollingSkewness(priceSeries, 50);
      const er10 = calculateEfficiencyRatio(priceSeries, 10);
      const adxDensityResult = calculateAdxDensity(adxResult['adx'], 50, 25);
      const diDominanceResult = calculateDiPlusDominance(
        adxResult['di_plus'],
        adxResult['di_minus'],
        50,
      );

      // --- 6. SLOPE (Наклоны) ---
      const slopePeriod = 5;
      const slopeEma50 = calculateSlope(ema50Values, slopePeriod);
      const slopeEma100 = calculateSlope(ema100Values, slopePeriod);
      const slopeEma150 = calculateSlope(ema150Values, slopePeriod);
      const slopeRvwap = calculateSlope(rVwwapResult['rvwap'], slopePeriod);
      const slopeMAvwap = calculateSlope(mAvwapResult['mAvwap'], slopePeriod);
      const slopeWAvwap = calculateSlope(wAvwapResult['wAvwap'], slopePeriod);
      const slopeZClose = calculateSlope(zScoreClose, slopePeriod);
      const slopeZVolume = calculateSlope(zScoreVolume, slopePeriod);
      const slopeZVolDelta = calculateSlope(zScoreVolDelta, slopePeriod);
      const slopeZoi = calculateSlope(zScoreOI, slopePeriod);
      const slopeZFunding = calculateSlope(zScoreFunding, slopePeriod);

      // --- 7. LINE STATES (Стандартный анализ Above/Below/Cross для простых линий) ---
      // const statesRvwap = analyzeLineStates(priceSeries, rVwwapResult['rvwap'], 'Rvwap'); // ЗАМЕНЕНО НА РАСШИРЕННЫЙ АНАЛИЗ
      const statesKama = analyzeLineStates(priceSeries, kamaResult['kama'], 'Kama');
      const statesEma50 = analyzeLineStates(priceSeries, ema50Values, 'Ema50');
      const statesEma100 = analyzeLineStates(priceSeries, ema100Values, 'Ema100');
      const statesEma150 = analyzeLineStates(priceSeries, ema150Values, 'Ema150');
      const statesWAvwap = analyzeLineStates(priceSeries, wAvwapResult['wAvwap'], 'WAvwap');
      const statesMAvwap = analyzeLineStates(priceSeries, mAvwapResult['mAvwap'], 'MAvwap');

      const fanResult = calculateEmaFan(
        ema50Values,
        ema100Values,
        ema150Values,
        closePrices
      );
      const breakout50 = analyzeBreakouts(
        closePrices,
        highestHighResult['highest50'],
        lowestLowResult['lowest50'],
        50,
      );
      const breakout100 = analyzeBreakouts(
        closePrices,
        highestHighResult['highest100'],
        lowestLowResult['lowest100'],
        100,
      );

      // --- RVWAP-RSI DIVERGENCE ---
      const rvwapRsiDivergence = analyzeRvwapRsiDivergence(
        closePrices,
        priceSeries.highPrice,
        priceSeries.lowPrice,
        rsiResult['rsi'],
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1'],
        5 // lookback period
      );

      // --- RVWAP-VZO DIVERGENCE ---
      const rvwapVzoDivergence = analyzeRvwapVzoDivergence(
        closePrices,
        priceSeries.highPrice,
        priceSeries.lowPrice,
        vzoResult['vzo'],
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1'],
        5 // lookback period
      );

      // --- RVWAP-CMF DIVERGENCE ---
      const rvwapCmfDivergence = analyzeRvwapCmfDivergence(
        closePrices,
        priceSeries.highPrice,
        priceSeries.lowPrice,
        cmfResult['cmf'],
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1'],
        5 // lookback period
      );

      // --- ORDER FLOW REGIME ---
      const orderFlowRegime = analyzeOrderFlowRegime(
        slopeZClose,
        slopeZoi,
        0 // slope threshold
      );

      // --- RVWAP MOMENTUM REVERSAL ---
      const momentumReversal = analyzeRvwapMomentumReversal(
        closePrices,
        macdResult['macd_histogram'],
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1']
      );

      // --- CMF SLOPE CHANGE ---
      const cmfSlopeChange = analyzeCmfSlopeChange(
        cmfResult['cmf'],
        5 // lookback period
      );

      // --- MARKET REGIME CHANGE ---
      const regimeChange = analyzeMarketRegimeChange(
        hurst,
        er10,
        0.4 // ER threshold
      );

      // --- VOLATILITY EXHAUSTION ---
      const volExhaustion = analyzeVolatilityExhaustion(
        kurtosis100,
        hurst,
        er10,
        5, // kurtosis threshold
        0.6 // hurst threshold
      );

      // --- SKEW REVERSAL ---
      const skewReversal = analyzeSkewReversal(
        closePrices,
        skewness50,
        rVwwapResult['rvwap_upper_band_1'],
        rVwwapResult['rvwap_lower_band_1'],
        1.5 // skew threshold
      );

      // --- 8. ЗАПИСЬ В СВЕЧИ (Data Mapping) ---
      coin.candles.forEach((candle, index) => {
        const c = candle as CandleWithIndicators;

        // --- PRICE NORMALIZATION (Min-Max за 50 свечей) ---
        c['highPriceNorm'] = normResult.highPriceNorm[index];
        c['lowPriceNorm'] = normResult.lowPriceNorm[index];
        c['openPriceNorm'] = normResult.openPriceNorm[index];
        c['closePriceNorm'] = normResult.closePriceNorm[index];

        c['volumeNorm'] = normVolume[index];
        c['volumeDeltaNorm'] = normVolumeDelta[index];
        c['openInterestNorm'] = normOI[index];
        c['fundingRateNorm'] = normFunding[index];

        c['ema50'] = ema50Values[index];
        c['ema100'] = ema100Values[index];
        c['ema150'] = ema150Values[index];

        c['adx'] = adxResult['adx'][index];
        c['diPlus'] = adxResult['di_plus'][index];
        c['diMinus'] = adxResult['di_minus'][index];
        c['adxDensity'] = adxDensityResult[index];
        c['diPlusDominance'] = diDominanceResult[index];

        c['wAvwap'] = wAvwapResult['wAvwap'][index];
        c['wAvwapUpperBand'] = wAvwapResult['wAvwapUpperBand'][index];
        c['wAvwapLowerBand'] = wAvwapResult['wAvwapLowerBand'][index];

        c['mAvwap'] = mAvwapResult['mAvwap'][index];
        c['mAvwapUpperBand'] = mAvwapResult['mAvwapUpperBand'][index];
        c['mAvwapLowerBand'] = mAvwapResult['mAvwapLowerBand'][index];

        c['bbBasis'] = bbResult['bb_basis'][index];
        c['bbUpper'] = bbResult['bb_upper'][index];
        c['bbLower'] = bbResult['bb_lower'][index];
        c['bbWidth'] = bbResult['bb_width'][index];

        c['chv'] = chvResult['chv'][index];
        c['cmf'] = cmfResult['cmf'][index];

        c['macd'] = macdResult['macd'][index];
        c['macdSignal'] = macdResult['macd_signal'][index];
        c['macdHistogram'] = macdResult['macd_histogram'][index];

        c['rsi'] = rsiResult['rsi'][index];
        c['obv'] = obvResult['obv'][index];
        c['obvEma20'] = obvResult['obv_ema_20'][index];

        // --- RVWAP Values ---
        c['rvwap'] = rVwwapResult['rvwap'][index];
        c['rvwapUpperBand1'] = rVwwapResult['rvwap_upper_band_1'][index];
        c['rvwapUpperBand2'] = rVwwapResult['rvwap_upper_band_2'][index];
        c['rvwapLowerBand1'] = rVwwapResult['rvwap_lower_band_1'][index];
        c['rvwapLowerBand2'] = rVwwapResult['rvwap_lower_band_2'][index];
        c['rvwapWidth1'] = rVwwapResult['rvwap_width_1'][index];
        c['rvwapWidth2'] = rVwwapResult['rvwap_width_2'][index];

        c['kama'] = kamaResult['kama'][index];

        c['isDoji'] = patternResult['isDoji'][index];
        c['isBullishEngulfing'] = patternResult['isBullishEngulfing'][index];
        c['isBearishEngulfing'] = patternResult['isBearishEngulfing'][index];
        c['isHammer'] = patternResult['isHammer'][index];
        c['isPinbar'] = patternResult['isPinbar'][index];

        c['lowest50'] = lowestLowResult['lowest50'][index];
        c['lowest100'] = lowestLowResult['lowest100'][index];
        c['highest50'] = highestHighResult['highest50'][index];
        c['highest100'] = highestHighResult['highest100'][index];

        c['vzo'] = vzoResult['vzo'][index];

        c['closePriceZScore'] = zScoreClose[index];
        c['volumeZScore'] = zScoreVolume[index];
        c['volumeDeltaZScore'] = zScoreVolDelta[index];
        c['fundingRateZScore'] = zScoreFunding[index];
        c['openInterestZScore'] = zScoreOI[index];

        c['kurtosis100'] = kurtosis100[index];
        const hData = hurst[index];
        c['hurst'] = hData.value;
        c['hurstConf'] = hData.confidence;
        c['skewness50'] = skewness50[index];
        c['er10'] = er10[index];

        c['slopeEma50'] = slopeEma50[index];
        c['slopeEma100'] = slopeEma100[index];
        c['slopeEma150'] = slopeEma150[index];
        c['slopeRvwap'] = slopeRvwap[index];
        c['slopeMAvwap'] = slopeMAvwap[index];
        c['slopeWAvwap'] = slopeWAvwap[index];
        c['slopeZClose'] = slopeZClose[index];
        c['slopeZVolume'] = slopeZVolume[index];
        c['slopeZVolumeDelta'] = slopeZVolDelta[index];
        c['slopeZOi'] = slopeZoi[index];
        c['slopeZFunding'] = slopeZFunding[index];

        // --- RVWAP FLAGS (REGIME) ---
        c['isBetweenRvwapBands'] = rvwapBandsAnalysis.isBetweenRvwapBands[index];
        c['isAboveRvwapUpperBand1'] = rvwapBandsAnalysis.isAboveRvwapUpperBand1[index];
        c['isAboveRvwapUpperBand2'] = rvwapBandsAnalysis.isAboveRvwapUpperBand2[index];
        c['isBelowRvwapLowerBand1'] = rvwapBandsAnalysis.isBelowRvwapLowerBand1[index];
        c['isBelowRvwapLowerBand2'] = rvwapBandsAnalysis.isBelowRvwapLowerBand2[index];

        // --- RVWAP FLAGS (CROSSES) ---
        c['isCrossedUpRvwap'] = rvwapCrossAnalysis.isCrossedUpRvwap[index];
        c['isCrossedDownRvwap'] = rvwapCrossAnalysis.isCrossedDownRvwap[index];
        c['isCrossedUpRvwapUpperBand1'] = rvwapCrossAnalysis.isCrossedUpRvwapUpperBand1[index];
        c['isCrossedDownRvwapUpperBand1'] = rvwapCrossAnalysis.isCrossedDownRvwapUpperBand1[index];
        c['isCrossedUpRvwapUpperBand2'] = rvwapCrossAnalysis.isCrossedUpRvwapUpperBand2[index];
        c['isCrossedDownRvwapUpperBand2'] = rvwapCrossAnalysis.isCrossedDownRvwapUpperBand2[index];
        c['isCrossedUpRvwapLowerBand1'] = rvwapCrossAnalysis.isCrossedUpRvwapLowerBand1[index];
        c['isCrossedDownRvwapLowerBand1'] = rvwapCrossAnalysis.isCrossedDownRvwapLowerBand1[index];
        c['isCrossedUpRvwapLowerBand2'] = rvwapCrossAnalysis.isCrossedUpRvwapLowerBand2[index];
        c['isCrossedDownRvwapLowerBand2'] = rvwapCrossAnalysis.isCrossedDownRvwapLowerBand2[index];

        // --- OTHER FLAGS ---
        c['isAboveKama'] = statesKama['isAboveKama'][index];
        c['isBelowKama'] = statesKama['isBelowKama'][index];
        c['isCrossedUpKama'] = statesKama['isCrossedUpKama'][index];
        c['isCrossedDownKama'] = statesKama['isCrossedDownKama'][index];

        c['isAboveEma50'] = statesEma50['isAboveEma50'][index];
        c['isBelowEma50'] = statesEma50['isBelowEma50'][index];
        c['isCrossedUpEma50'] = statesEma50['isCrossedUpEma50'][index];
        c['isCrossedDownEma50'] = statesEma50['isCrossedDownEma50'][index];

        c['isAboveEma100'] = statesEma100['isAboveEma100'][index];
        c['isBelowEma100'] = statesEma100['isBelowEma100'][index];
        c['isCrossedUpEma100'] = statesEma100['isCrossedUpEma100'][index];
        c['isCrossedDownEma100'] = statesEma100['isCrossedDownEma100'][index];

        c['isAboveEma150'] = statesEma150['isAboveEma150'][index];
        c['isBelowEma150'] = statesEma150['isBelowEma150'][index];
        c['isCrossedUpEma150'] = statesEma150['isCrossedUpEma150'][index];
        c['isCrossedDownEma150'] = statesEma150['isCrossedDownEma150'][index];

        c['isAboveWAvwap'] = statesWAvwap['isAboveWAvwap'][index];
        c['isBelowWAvwap'] = statesWAvwap['isBelowWAvwap'][index];
        c['isCrossedUpWAvwap'] = statesWAvwap['isCrossedUpWAvwap'][index];
        c['isCrossedDownWAvwap'] = statesWAvwap['isCrossedDownWAvwap'][index];

        c['isAboveMAvwap'] = statesMAvwap['isAboveMAvwap'][index];
        c['isBelowMAvwap'] = statesMAvwap['isBelowMAvwap'][index];
        c['isCrossedUpMAvwap'] = statesMAvwap['isCrossedUpMAvwap'][index];
        c['isCrossedDownMAvwap'] = statesMAvwap['isCrossedDownMAvwap'][index];

        c['isBullishFan'] = fanResult['isBullishFan'][index];
        c['isBearishFan'] = fanResult['isBearishFan'][index];
        c['isMessFan'] = fanResult['isMessFan'][index];
        c['isBullishPunch'] = fanResult['isBullishPunch'][index];
        c['isBearishPunch'] = fanResult['isBearishPunch'][index];

        c['isCrossedUpHighest50'] = breakout50['isCrossedUpHighest50'][index];
        c['isCrossedDownLowest50'] = breakout50['isCrossedDownLowest50'][index];
        c['isCrossedUpHighest100'] = breakout100['isCrossedUpHighest100'][index];
        c['isCrossedDownLowest100'] = breakout100['isCrossedDownLowest100'][index];

        // --- RVWAP-RSI DIVERGENCE FLAGS ---
        c['isBullishRvwapRsiDivergence'] = rvwapRsiDivergence['isBullishRvwapRsiDivergence'][index];
        c['isBearishRvwapRsiDivergence'] = rvwapRsiDivergence['isBearishRvwapRsiDivergence'][index];

        // --- RVWAP-VZO DIVERGENCE FLAGS ---
        c['isBullishRvwapVzoDivergence'] = rvwapVzoDivergence['isBullishRvwapVzoDivergence'][index];
        c['isBearishRvwapVzoDivergence'] = rvwapVzoDivergence['isBearishRvwapVzoDivergence'][index];

        // --- RVWAP-CMF DIVERGENCE FLAGS ---
        c['isBullishRvwapCmfDivergence'] = rvwapCmfDivergence['isBullishRvwapCmfDivergence'][index];
        c['isBearishRvwapCmfDivergence'] = rvwapCmfDivergence['isBearishRvwapCmfDivergence'][index];

        // --- ORDER FLOW REGIME FLAGS ---
        c['isLongAccumulation'] = orderFlowRegime['isLongAccumulation'][index];
        c['isShortAccumulation'] = orderFlowRegime['isShortAccumulation'][index];
        c['isLongLiquidation'] = orderFlowRegime['isLongLiquidation'][index];
        c['isShortCovering'] = orderFlowRegime['isShortCovering'][index];

        // --- RVWAP MOMENTUM REVERSAL FLAGS ---
        c['isTopReversalRisk'] = momentumReversal['isTopReversalRisk'][index];
        c['isBottomReversalChance'] = momentumReversal['isBottomReversalChance'][index];

        // --- CMF SLOPE CHANGE FLAGS ---
        c['isCmfSlopeUp'] = cmfSlopeChange['isCmfSlopeUp'][index];
        c['isCmfSlopeDown'] = cmfSlopeChange['isCmfSlopeDown'][index];

        // --- STATISTICAL METRICS ---
        c['hurst'] = hurst[index]?.value;
        c['hurstConfidence'] = hurst[index]?.confidence;
        c['kurtosis'] = kurtosis100[index];
        c['skewness'] = skewness50[index];
        c['efficiencyRatio'] = er10[index];

        // --- MARKET REGIME FLAGS ---
        c['isTrendingRegimeStart'] = regimeChange['isTrendingRegimeStart'][index];
        c['isMeanReversionRegimeStart'] = regimeChange['isMeanReversionRegimeStart'][index];

        // --- VOLATILITY EXHAUSTION FLAG ---
        c['isVolatilityExhaustion'] = volExhaustion['isVolatilityExhaustion'][index];

        // --- SKEW REVERSAL FLAGS ---
        c['isBullishSkewReversal'] = skewReversal['isBullishSkewReversal'][index];
        c['isBearishSkewReversal'] = skewReversal['isBearishSkewReversal'][index];
      });
    }
    return data;
  }
}
