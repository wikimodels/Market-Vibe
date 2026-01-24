import { ScannerConfig } from '../models/scanner.config';

export interface AnalyticsRegistryItem {
  label: string;
  config: ScannerConfig;
  docFile: string; // Имя файла в assets/data/analytics/ без расширения
}

export const ANALYTICS_REGISTRY: Record<string, AnalyticsRegistryItem> = {
  // === TREND ===
  adx_above_25_pct: {
    label: 'ADX Density',
    docFile: 'adx_above_25_pct_reference',
    config: {
      title: 'ADX Density Scanner',
      metricPrefix: 'adx_above_25_pct_90d',
      visualType: 'standard',
      theme: 'higher-better', // Чем выше плотность тренда, тем лучше
      max: 1.0,
    },
  },
  trend_quality: {
    label: 'Trend Quality',
    docFile: 'trend_quality_reference',
    config: {
      title: 'Trend Quality Scanner',
      metricPrefix: 'trend_quality',
      suffix: '_w20',
      visualType: 'standard',
      theme: 'higher-better',
      max: 1.0, // R-Squared
    },
  },
  swing_quality: {
    label: 'Swing Quality',
    docFile: 'swing_quality_reference',
    config: {
      title: 'Swing Quality Scanner',
      metricPrefix: 'swing_quality',
      suffix: '_w5',
      visualType: 'standard',
      theme: 'higher-better',
      max: 1.0,
    },
  },
  smoothness_index: {
    label: 'Smoothness Index',
    docFile: 'smoothness_index_reference',
    config: {
      title: 'Smoothness Scanner',
      metricPrefix: 'smoothness_index',
      suffix: '_w20',
      visualType: 'standard',
      theme: 'higher-better',
      max: 1.0,
    },
  },
  di_plus_dominant_pct: {
    label: 'DI+ Dominance',
    docFile: 'di_plus_dominant_pct_reference',
    config: {
      title: 'DI+ Dominance Scanner',
      metricPrefix: 'di_plus_dominant_pct_90d',
      visualType: 'standard',
      theme: 'bull-bear', // 0 = Bear, 1 = Bull (Custom logic handling in component suggested, or treating as standard scale with color map)
      max: 1.0,
    },
  },

  // === VOLATILITY & RISK ===
  atr_stability: {
    label: 'ATR Stability',
    docFile: 'atr_stability_reference',
    config: {
      title: 'ATR Stability Scanner',
      metricPrefix: 'atr_stability',
      suffix: '_w14',
      visualType: 'standard',
      theme: 'higher-better', // Высокая стабильность = хорошо
      max: 15.0, // Примерный максимум для шкалы
    },
  },
  kurtosis: {
    label: 'Kurtosis',
    docFile: 'kurtosis_reference',
    config: {
      title: 'Kurtosis Risk Scanner',
      metricPrefix: 'kurtosis',
      suffix: '_w50',
      visualType: 'standard',
      theme: 'lower-better', // Высокий куртозис = риск хвостов
      max: 10.0,
    },
  },
  skewness: {
    label: 'Skewness',
    docFile: 'skewness_reference',
    config: {
      title: 'Skewness Scanner',
      metricPrefix: 'skewness',
      suffix: '_w50',
      visualType: 'diverging',
      theme: 'bull-bear', // Pos = Pump risk (Greenish), Neg = Crash risk (Red)
      max: 1.5,
    },
  },
  jagginess: {
    label: 'Jagginess',
    docFile: 'jagginess_reference',
    config: {
      title: 'Jagginess Scanner',
      metricPrefix: 'jagginess',
      suffix: '_w20',
      visualType: 'standard',
      theme: 'lower-better', // Меньше = лучше
      max: 1.0,
    },
  },
  mean_reversion_quality: {
    label: 'MR Quality',
    docFile: 'mean_reversion_quality_reference',
    config: {
      title: 'Mean Reversion Quality',
      metricPrefix: 'mr_quality',
      suffix: '_w20',
      visualType: 'standard',
      theme: 'higher-better',
      max: 1.0,
    },
  },

  // === MARKET PHYSICS ===
  entropy: {
    label: 'Entropy',
    docFile: 'entropy_reference',
    config: {
      title: 'Entropy Structure Scanner',
      metricPrefix: 'entropy',
      visualType: 'standard',
      theme: 'lower-better', // Низкая энтропия = структура
      max: 3.32,
    },
  },
  fractal_dimension: {
    label: 'Fractal Dimension',
    docFile: 'fractal_dimension_reference',
    config: {
      title: 'Fractal Dimension Scanner',
      metricPrefix: 'fractal_dimension',
      visualType: 'standard',
      theme: 'lower-better', // 1.0 = линия, 2.0 = шум
      min: 1.0,
      max: 2.0,
    },
  },
  hurst: {
    label: 'Hurst Exponent',
    docFile: 'hurst_reference',
    config: {
      title: 'Hurst Exponent Scanner',
      metricPrefix: 'hurst',
      visualType: 'standard',
      theme: 'higher-better', // > 0.5 тренд
      max: 1.0,
    },
  },
  mci: {
    label: 'MCI',
    docFile: 'mci_reference',
    config: {
      title: 'Market Condition Index',
      metricPrefix: 'mci',
      visualType: 'diverging',
      theme: 'bull-bear', // >0 Trend, <0 Chaos/Reversion (Custom handling usually, but diverging fits)
      max: 0.5,
    },
  },
  movement_intensity: {
    label: 'Movement Intensity',
    docFile: 'movement_intensity_reference',
    config: {
      title: 'Movement Intensity Scanner',
      metricPrefix: 'movement_intensity',
      suffix: '_w14',
      visualType: 'standard',
      theme: 'higher-better', // Higher = more activity
      max: 5.0,
    },
  },
  movement_efficiency: {
    label: 'Movement Efficiency',
    docFile: 'movement_efficiency_reference',
    config: {
      title: 'Movement Efficiency Scanner',
      metricPrefix: 'movement_efficiency',
      visualType: 'diverging',
      theme: 'bull-bear', // +1 Bull, -1 Bear
      max: 0.6,
    },
  },
  // Дубликат для удобства, если в меню есть просто "Efficiency"
  efficiency: {
    label: 'Efficiency',
    docFile: 'efficiency_reference',
    config: {
      title: 'Efficiency Scanner',
      metricPrefix: 'movement_efficiency',
      visualType: 'diverging',
      theme: 'bull-bear',
      max: 0.6,
    },
  },

  // === SPECIAL ===
  btc_correlation: {
    label: 'BTC Correlation',
    docFile: 'btc_correlation_reference',
    // Config здесь может быть игнорирован, так как используется спец-компонент,
    // но оставляем для единообразия типов
    config: {
      title: 'BTC Correlation Scanner',
      metricPrefix: 'btc_corr',
      visualType: 'diverging',
      theme: 'bull-bear',
    },
  },
};
