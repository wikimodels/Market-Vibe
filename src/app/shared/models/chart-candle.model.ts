import { UTCTimestamp } from 'lightweight-charts';

/**
 * Формат, который требует библиотека lightweight-charts
 * 'time' здесь - это Unix Timestamp в СЕКУНДАХ
 */
export interface ChartCandle {
  time: UTCTimestamp; // (Это 'number' в секундах)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
