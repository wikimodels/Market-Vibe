import { BUFFER_MS } from '../../../../environments/environment';
import { MarketData, TF } from '../../../models/kline.model';

/**
 * ЕДИНАЯ точка истины для проверки свежести kline-данных.
 *
 * Правило (строгое, fail-closed): из локального хранилища (RAM / IndexedDB)
 * отдаются ТОЛЬКО свежие данные. Протухшие приравниваются к отсутствующим.
 *
 * Формула: данные свежи, пока now <= maxLastOpenTime + 2 * timeframeMs + BUFFER_MS.
 * Любая ошибка / пустые данные / неизвестный таймфрейм без свечей => EXPIRED.
 */

export function parseTimeframeToMs(timeframe: TF | string): number {
  const ONE_HOUR = 60 * 60 * 1000;
  const tfStr = String(timeframe);
  if (tfStr === '1h') return ONE_HOUR;
  if (tfStr === '4h') return 4 * ONE_HOUR;
  if (tfStr === '8h') return 8 * ONE_HOUR;
  if (tfStr === '12h') return 12 * ONE_HOUR;
  if (tfStr === 'D' || tfStr === '1d') return 24 * ONE_HOUR;
  return 0;
}

/** Максимальный openTime последней свечи по всем монетам. 0 — валидных свечей нет. */
export function getMaxLastOpenTime(data: MarketData | null | undefined): number {
  if (!data || !data.data || data.data.length === 0) return 0;
  let maxLastOpenTime = 0;
  for (const coin of data.data) {
    if (!coin.candles || coin.candles.length === 0) continue;
    const lastCandle = coin.candles[coin.candles.length - 1];
    if (lastCandle && lastCandle.openTime > maxLastOpenTime) {
      maxLastOpenTime = lastCandle.openTime;
    }
  }
  return maxLastOpenTime;
}

/**
 * true — данные ПРОТУХЛИ (или их нет) и отдавать их нельзя.
 * false — данные свежие.
 */
export function isMarketDataExpired(
  data: MarketData | null | undefined,
  timeframe: TF | string,
): boolean {
  try {
    if (!data || !data.data || data.data.length === 0) return true;

    // лажа: старый кэш 931 вместо 79 после blacklist+corr — считаем протухшим чтобы перезалить 78
    if (data.data.length > 200) return true;

    const timeframeMs = parseTimeframeToMs(timeframe);
    if (timeframeMs === 0) return true;

    const maxLastOpenTime = getMaxLastOpenTime(data);
    if (maxLastOpenTime === 0) return true;

    const currentTime = Date.now();
    // 4ч свеча 11:00 при сейчас 18:00 должна считаться протухшей — 1*TF+буфер, а не 2*TF
    const expiryTime = maxLastOpenTime + timeframeMs + BUFFER_MS + 5 * 60 * 1000;
    return currentTime > expiryTime;
  } catch {
    // Fail-closed: при любой ошибке считаем данные протухшими.
    return true;
  }
}

/** Диагностическая информация для логов (не влияет на решение). */
export function getFreshnessInfo(data: MarketData | null | undefined, timeframe: TF | string) {
  const timeframeMs = parseTimeframeToMs(timeframe);
  const maxLastOpenTime = getMaxLastOpenTime(data);
  const currentTime = Date.now();
  const expiryTime = maxLastOpenTime + timeframeMs + BUFFER_MS + 5 * 60 * 1000;
  return {
    maxLastOpenTime: maxLastOpenTime ? new Date(maxLastOpenTime).toISOString() : null,
    currentTime: new Date(currentTime).toISOString(),
    expiryTime: maxLastOpenTime ? new Date(expiryTime).toISOString() : null,
    timeframeMs,
    bufferMs: BUFFER_MS,
    isExpired: isMarketDataExpired(data, timeframe),
    ageMinutes:
      maxLastOpenTime > 0 ? Math.round((currentTime - maxLastOpenTime) / 1000 / 60) : null,
  };
}
