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
