// src/app/analytics/models/scanner.config.ts

export type VisualType = 'standard' | 'diverging'; // 0..100 или -1..+1
export type ColorTheme = 'higher-better' | 'lower-better' | 'bull-bear' | 'chaos-structure';

export interface ScannerConfig {
  title: string; // Название таблицы (например, "Entropy Scanner")
  metricPrefix: string; // Префикс поля в CoinData (например, "entropy")
  suffix?: string; // Суффикс (например, "_w20"), если есть
  visualType: VisualType; // Тип бара
  theme: ColorTheme; // Логика раскраски
  min?: number; // Минимум для масштаба бара (по умолчанию 0)
  max?: number; // Максимум для масштаба бара (по умолчанию 1)
}

// Примеры конфигураций (можно использовать как пресеты)
export const SCANNERS: Record<string, ScannerConfig> = {
  ENTROPY: {
    title: 'Entropy Structure Scanner',
    metricPrefix: 'entropy',
    visualType: 'standard',
    theme: 'lower-better', // Меньше = Структура (Синий), Больше = Хаос (Красный)
    max: 3.32,
  },
  EFFICIENCY: {
    title: 'Efficiency Scanner',
    metricPrefix: 'movement_efficiency',
    visualType: 'diverging',
    theme: 'bull-bear', // Плюс = Зеленый, Минус = Красный
    max: 0.5, // Масштабируем до 0.5 для чувствительности
  },
  ADX_DENSITY: {
    title: 'ADX Density Scanner',
    metricPrefix: 'adx_above_25_pct_90d',
    visualType: 'standard',
    theme: 'higher-better',
    max: 1.0,
  },
};
