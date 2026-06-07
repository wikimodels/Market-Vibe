import { PriceSeries } from '../models/kline.model';

/**
 * Результат расчёта VWAP Gravity для одного таймфрейма.
 */
export interface VwapGravityResult {
  /** Времена открытия свечей (весь ряд). */
  openTime: number[];
  /** Значения Rolling VWAP (48-свечное скользящее окно). NaN там, где окно ещё не набрано. */
  rvwap: number[];
  /** Верхняя полоса RVWAP + 1σ */
  upperBand: number[];
  /** Нижняя полоса RVWAP − 1σ */
  lowerBand: number[];
  /** Доля свечей (0–1), где close < RVWAP за последние 48 свечей. */
  gravityPct: number[];
  /** Доля свечей (0–1), где close > RVWAP за последние 48 свечей. */
  buoyancyPct: number[];
}

/**
 * Рассчитывает Rolling VWAP (скользящее окно в `windowSize` свечей),
 * его стандартное отклонение, а также «гравитацию» и «буйность» —
 * скользящую долю свечей ниже/выше RVWAP за последние 48 свечей.
 *
 * Формула RVWAP соответствует логике ShortScreener (`vwap_weakness.md`):
 *   TP = (High + Low + Close) / 3
 *   RVWAP = Σ(TP × Vol) / Σ(Vol)    за окно `windowSize` свечей
 *   Var    = Σ(Vol × TP²) / Σ(Vol) − RVWAP²
 *   StDev  = sqrt(max(0, Var))
 *
 * @param series       Ценовые серии (PriceSeries).
 * @param windowSize   Размер скользящего VWAP-окна в свечах (по умолчанию 48).
 * @param stdevMult    Множитель StDev для полос (по умолчанию 1.0).
 */
export function calculateVwapGravity(
  series: PriceSeries,
  windowSize = 48,
  stdevMult = 1.0
): VwapGravityResult {
  const n = series.closePrice.length;

  const rvwap: number[] = new Array(n).fill(NaN);
  const upperBand: number[] = new Array(n).fill(NaN);
  const lowerBand: number[] = new Array(n).fill(NaN);
  const gravityPct: number[] = new Array(n).fill(NaN);
  const buoyancyPct: number[] = new Array(n).fill(NaN);

  const { openTime, highPrice, lowPrice, closePrice, volume } = series;

  if (n === 0 || windowSize <= 0) {
    return { openTime, rvwap, upperBand, lowerBand, gravityPct, buoyancyPct };
  }

  // ─── Шаг 1: Rolling VWAP + StDev через скользящее окно (два указателя) ─────
  // Используем кумулятивный подход со сдвигающимся левым указателем.
  let sumTpVol = 0;    // Σ(TP × Vol)
  let sumVol = 0;      // Σ(Vol)
  let sumTp2Vol = 0;   // Σ(Vol × TP²)
  let left = 0;

  for (let i = 0; i < n; i++) {
    const tp = (highPrice[i] + lowPrice[i] + closePrice[i]) / 3;
    const vol = volume[i];

    sumTpVol += tp * vol;
    sumVol += vol;
    sumTp2Vol += vol * tp * tp;

    // Сдвигаем левую границу, чтобы окно не превышало windowSize
    while (i - left + 1 > windowSize) {
      const tpL = (highPrice[left] + lowPrice[left] + closePrice[left]) / 3;
      const volL = volume[left];
      sumTpVol -= tpL * volL;
      sumVol -= volL;
      sumTp2Vol -= volL * tpL * tpL;
      left++;
    }

    // Окно набрано — вычисляем RVWAP
    if (sumVol > 0) {
      const rv = sumTpVol / sumVol;
      rvwap[i] = rv;

      const variance = Math.max(0, sumTp2Vol / sumVol - rv * rv);
      const std = Math.sqrt(variance);
      upperBand[i] = rv + std * stdevMult;
      lowerBand[i] = rv - std * stdevMult;
    }
  }

  // ─── Шаг 2: Скользящая Gravity/Buoyancy за последние `windowSize` свечей ──
  // Для каждой позиции i считаем долю свечей [i-windowSize+1 .. i],
  // где close < rvwap (gravity) или close > rvwap (buoyancy).
  // Используем скользящий счётчик.
  let belowCount = 0;
  let aboveCount = 0;

  for (let i = 0; i < n; i++) {
    const rv = rvwap[i];
    const cl = closePrice[i];

    // Учитываем текущую свечу (только если RVWAP посчитан)
    if (!isNaN(rv)) {
      if (cl < rv) belowCount++;
      else if (cl > rv) aboveCount++;
    }

    // Убираем свечу, уходящую за левую границу окна
    if (i >= windowSize) {
      const oldIdx = i - windowSize;
      const oldRv = rvwap[oldIdx];
      const oldCl = closePrice[oldIdx];
      if (!isNaN(oldRv)) {
        if (oldCl < oldRv) belowCount--;
        else if (oldCl > oldRv) aboveCount--;
      }
    }

    // Записываем результат только когда набралось полное окно
    if (i >= windowSize - 1) {
      const windowLen = Math.min(i + 1, windowSize);
      gravityPct[i] = belowCount / windowLen;
      buoyancyPct[i] = aboveCount / windowLen;
    }
  }

  return { openTime, rvwap, upperBand, lowerBand, gravityPct, buoyancyPct };
}
