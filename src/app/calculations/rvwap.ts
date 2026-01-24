import { PriceSeries } from '../models/kline.model';

// Карта для перевода таймфреймов в миллисекунды.
const TIMEFRAME_MS_MAP: { [key: string]: number } = {
  '1m': 60000,
  '5m': 300000,
  '15m': 900000,
  '30m': 1800000,
  '1h': 3600000,
  '4h': 14400000,
  '8h': 28800000,
  '12h': 43200000,
  '1d': 86400000,
};

/**
 * Определяет размер временного окна в миллисекундах, повторяя логику TradingView,
 * на основе таймфрейма, на котором рассчитывается RVWAP.
 */
function _getTimeWindowMs(timeframe: string): number {
  const tfInMs = TIMEFRAME_MS_MAP[timeframe] || 0;

  const MS_IN_MIN = 60000;
  const MS_IN_HOUR = 3600000;
  const MS_IN_DAY = 86400000;

  let windowSizeMs = 0;

  // Логика TradingView, определяющая rolling window size
  if (tfInMs <= MS_IN_MIN) {
    windowSizeMs = 1 * MS_IN_HOUR; // 1H
  } else if (tfInMs <= MS_IN_MIN * 5) {
    windowSizeMs = 4 * MS_IN_HOUR; // 4H
  } else if (tfInMs <= MS_IN_HOUR) {
    windowSizeMs = 1 * MS_IN_DAY; // 1D
  } else if (tfInMs <= MS_IN_HOUR * 4) {
    windowSizeMs = 3 * MS_IN_DAY; // 3D
  } else if (tfInMs <= MS_IN_HOUR * 12) {
    windowSizeMs = 7 * MS_IN_DAY; // 7D
  } else if (tfInMs <= MS_IN_DAY) {
    windowSizeMs = 30 * MS_IN_DAY; // 30D
  } else {
    windowSizeMs = 90 * MS_IN_DAY; // 90D
  }

  return windowSizeMs;
}

/**
 * Рассчитывает Rolling VWAP (RVWAP) и его полосы стандартного отклонения.
 * @param series Объект PriceSeries, включая PriceSeries.timeframe.
 * @param stdevMults Список множителей для полос стандартного отклонения.
 */
export function calculateRVWAP(series: PriceSeries, stdevMults: number[] = [1.0, 2.0, 3.0]) {
  const arrayLength = series.closePrice.length;
  // ✅ ИСПОЛЬЗУЕМ: Получаем timeframe из PriceSeries
  const windowSizeMs = _getTimeWindowMs(series.timeframe);

  // Массивы данных (для читаемости)
  const { openTime, highPrice, lowPrice, closePrice, volume } = series;

  // Результаты
  const results: any = {};
  const rvwapValues: number[] = new Array(arrayLength).fill(NaN);

  if (arrayLength === 0 || windowSizeMs === 0) {
    return results;
  }

  let leftIndex = 0; // Левый указатель скользящего окна
  let cumSrcVol = 0;
  let cumVol = 0;
  let cumSrcSrcVol = 0;

  // Компоненты для расчета полос
  const stdValues: number[] = new Array(arrayLength).fill(NaN);

  for (let i = 0; i < arrayLength; i++) {
    const currentOpenTime = openTime[i];

    // 1. Подготовка компонентов текущей свечи
    const src = (highPrice[i] + lowPrice[i] + closePrice[i]) / 3;
    const vol = volume[i];

    const srcVolume = src * vol;
    const srcSrcVolume = vol * src ** 2;

    // Добавляем данные текущей свечи к кумулятивным суммам
    cumSrcVol += srcVolume;
    cumVol += vol;
    cumSrcSrcVol += srcSrcVolume;

    // 2. Сдвиг окна (удаление старых свечей)
    // Пока свеча на leftIndex находится вне временного окна, удаляем ее вклад
    while (openTime[leftIndex] < currentOpenTime - windowSizeMs && leftIndex < i) {
      const leftSrc = (highPrice[leftIndex] + lowPrice[leftIndex] + closePrice[leftIndex]) / 3;
      const leftVol = volume[leftIndex];

      // Вычитаем вклад свечи, покидающей окно
      cumSrcVol -= leftSrc * leftVol;
      cumVol -= leftVol;
      cumSrcSrcVol -= leftVol * leftSrc ** 2;

      leftIndex++;
    }

    // 3. Расчет RVWAP и StDev
    if (cumVol > 0) {
      const rvwap = cumSrcVol / cumVol;
      rvwapValues[i] = rvwap;

      // Дисперсия и Ст. отклонение
      let variance = cumSrcSrcVol / cumVol - rvwap ** 2;
      variance = Math.max(0, variance); // Дисперсия >= 0
      stdValues[i] = Math.sqrt(variance);
    } else {
      rvwapValues[i] = NaN;
      stdValues[i] = NaN;
    }
  }

  // 4. Расчет полос и ширины
  results['rvwap'] = rvwapValues;

  for (const mult of stdevMults) {
    const upperBand: number[] = new Array(arrayLength).fill(NaN);
    const lowerBand: number[] = new Array(arrayLength).fill(NaN);
    const width: number[] = new Array(arrayLength).fill(NaN);

    // В JS String(1.0) дает "1", String(2.0) дает "2".
    // Поэтому ключи будут 'rvwap_upper_band_1', 'rvwap_upper_band_2'
    const multStr = String(mult).replace('.', '_');

    for (let i = 0; i < arrayLength; i++) {
      if (!Number.isNaN(rvwapValues[i]) && !Number.isNaN(stdValues[i])) {
        upperBand[i] = rvwapValues[i] + stdValues[i] * mult;
        lowerBand[i] = rvwapValues[i] - stdValues[i] * mult;

        if (rvwapValues[i] !== 0) {
          width[i] = (upperBand[i] - lowerBand[i]) / rvwapValues[i];
        }
      }
    }

    results[`rvwap_upper_band_${multStr}`] = upperBand;
    results[`rvwap_lower_band_${multStr}`] = lowerBand;
    results[`rvwap_width_${multStr}`] = width;
  }

  return results;
}

/**
 * Анализирует положение цены относительно полос RVWAP.
 * Возвращает флаги нахождения внутри канала (Regime).
 */
export function analyzeRvwapBands(
  closePrices: number[],
  upper1: number[],
  lower1: number[],
  upper2: number[],
  lower2: number[]
) {
  const len = closePrices.length;

  // 🔥 ЗАЩИТА ОТ UNDEFINED
  if (!upper1 || !lower1 || !upper2 || !lower2) {
    return {
      isBetweenRvwapBands: new Array(len).fill(false),
      isAboveRvwapUpperBand1: new Array(len).fill(false),
      isAboveRvwapUpperBand2: new Array(len).fill(false),
      isBelowRvwapLowerBand1: new Array(len).fill(false),
      isBelowRvwapLowerBand2: new Array(len).fill(false),
    };
  }

  const isBetween: boolean[] = new Array(len).fill(false);
  const isAbove1: boolean[] = new Array(len).fill(false);
  const isAbove2: boolean[] = new Array(len).fill(false);
  const isBelow1: boolean[] = new Array(len).fill(false);
  const isBelow2: boolean[] = new Array(len).fill(false);

  for (let i = 0; i < len; i++) {
    const close = closePrices[i];
    const u1 = upper1[i];
    const l1 = lower1[i];
    const u2 = upper2[i];
    const l2 = lower2[i];

    if (Number.isNaN(close)) continue;

    // 1. Between Bands (Флет внутри 1-й девиации)
    if (!Number.isNaN(u1) && !Number.isNaN(l1)) {
      if (close <= u1 && close >= l1) {
        isBetween[i] = true;
      }
    }

    // 2. Above Bands
    if (!Number.isNaN(u1) && close > u1) isAbove1[i] = true;
    if (!Number.isNaN(u2) && close > u2) isAbove2[i] = true;

    // 3. Below Bands
    if (!Number.isNaN(l1) && close < l1) isBelow1[i] = true;
    if (!Number.isNaN(l2) && close < l2) isBelow2[i] = true;
  }

  return {
    isBetweenRvwapBands: isBetween,
    isAboveRvwapUpperBand1: isAbove1,
    isAboveRvwapUpperBand2: isAbove2,
    isBelowRvwapLowerBand1: isBelow1,
    isBelowRvwapLowerBand2: isBelow2,
  };
}

/**
 * Анализирует пересечения (пробои) цены и всех линий RVWAP в обе стороны.
 * Теперь учитываем и возвраты в канал, и ложные пробои.
 */
export function analyzeRvwapCrosses(
  closePrices: number[],
  rvwap: number[],
  upper1: number[],
  lower1: number[],
  upper2: number[],
  lower2: number[]
) {
  const len = closePrices.length;

  // 🔥 ЗАЩИТА ОТ UNDEFINED
  if (!rvwap || !upper1 || !lower1 || !upper2 || !lower2) {
    const empty = new Array(len).fill(false);
    return {
      isCrossedUpRvwap: empty,
      isCrossedDownRvwap: empty,

      isCrossedUpRvwapUpperBand1: empty,
      isCrossedDownRvwapUpperBand1: empty,

      isCrossedUpRvwapUpperBand2: empty,
      isCrossedDownRvwapUpperBand2: empty,

      isCrossedUpRvwapLowerBand1: empty,
      isCrossedDownRvwapLowerBand1: empty,

      isCrossedUpRvwapLowerBand2: empty,
      isCrossedDownRvwapLowerBand2: empty,
    };
  }

  // Инициализация массивов (10 штук)
  const crossUpMain: boolean[] = new Array(len).fill(false);
  const crossDownMain: boolean[] = new Array(len).fill(false);

  const crossUpU1: boolean[] = new Array(len).fill(false);
  const crossDownU1: boolean[] = new Array(len).fill(false); // Возврат под U1

  const crossUpU2: boolean[] = new Array(len).fill(false);
  const crossDownU2: boolean[] = new Array(len).fill(false); // Возврат под U2

  const crossUpL1: boolean[] = new Array(len).fill(false); // Возврат над L1
  const crossDownL1: boolean[] = new Array(len).fill(false);

  const crossUpL2: boolean[] = new Array(len).fill(false); // Возврат над L2
  const crossDownL2: boolean[] = new Array(len).fill(false);

  for (let i = 1; i < len; i++) {
    const close = closePrices[i];
    const prevClose = closePrices[i - 1];

    if (Number.isNaN(close) || Number.isNaN(prevClose)) continue;

    // 1. MAIN RVWAP
    if (!Number.isNaN(rvwap[i]) && !Number.isNaN(rvwap[i - 1])) {
      if (prevClose <= rvwap[i - 1] && close > rvwap[i]) crossUpMain[i] = true;
      if (prevClose >= rvwap[i - 1] && close < rvwap[i]) crossDownMain[i] = true;
    }

    // 2. UPPER BAND 1
    if (!Number.isNaN(upper1[i]) && !Number.isNaN(upper1[i - 1])) {
      if (prevClose <= upper1[i - 1] && close > upper1[i]) crossUpU1[i] = true; // Breakout
      if (prevClose >= upper1[i - 1] && close < upper1[i]) crossDownU1[i] = true; // Fakeout / Return
    }

    // 3. UPPER BAND 2
    if (!Number.isNaN(upper2[i]) && !Number.isNaN(upper2[i - 1])) {
      if (prevClose <= upper2[i - 1] && close > upper2[i]) crossUpU2[i] = true; // FOMO Breakout
      if (prevClose >= upper2[i - 1] && close < upper2[i]) crossDownU2[i] = true; // Cooling
    }

    // 4. LOWER BAND 1
    if (!Number.isNaN(lower1[i]) && !Number.isNaN(lower1[i - 1])) {
      if (prevClose <= lower1[i - 1] && close > lower1[i]) crossUpL1[i] = true; // Recovery
      if (prevClose >= lower1[i - 1] && close < lower1[i]) crossDownL1[i] = true; // Breakdown
    }

    // 5. LOWER BAND 2
    if (!Number.isNaN(lower2[i]) && !Number.isNaN(lower2[i - 1])) {
      if (prevClose <= lower2[i - 1] && close > lower2[i]) crossUpL2[i] = true; // Bounce
      if (prevClose >= lower2[i - 1] && close < lower2[i]) crossDownL2[i] = true; // Panic Breakdown
    }
  }

  return {
    isCrossedUpRvwap: crossUpMain,
    isCrossedDownRvwap: crossDownMain,

    isCrossedUpRvwapUpperBand1: crossUpU1,
    isCrossedDownRvwapUpperBand1: crossDownU1,

    isCrossedUpRvwapUpperBand2: crossUpU2,
    isCrossedDownRvwapUpperBand2: crossDownU2,

    isCrossedUpRvwapLowerBand1: crossUpL1,
    isCrossedDownRvwapLowerBand1: crossDownL1,

    isCrossedUpRvwapLowerBand2: crossUpL2,
    isCrossedDownRvwapLowerBand2: crossDownL2,
  };
}
