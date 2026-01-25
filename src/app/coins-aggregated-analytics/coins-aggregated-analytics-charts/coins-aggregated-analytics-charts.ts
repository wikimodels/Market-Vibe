import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsModule } from 'ngx-echarts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog'; // Если нужен диалог info

import { AnalyticsChartsData } from '../../models/analytics-charts-data.model';
import { AnalyticsTab } from '../../models/analytics-tab.model';
import { SignalIntensityTableComponent } from '../signal-intensity-table/signal-intensity-table.component';

@Component({
  selector: 'app-coins-aggregated-analytics-charts',
  standalone: true,
  imports: [CommonModule, MatTabsModule, NgxEchartsModule, MatButtonModule, MatIconModule, SignalIntensityTableComponent],
  templateUrl: './coins-aggregated-analytics-charts.html',
  styleUrls: [
    './coins-aggregated-analytics-charts.scss',
    '../../shared/styles/_analytics_charts.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsAggregatedAnalyticsCharts {
  // Список таймфреймов для генерации табов в шаблоне
  public readonly timeframes = ['1h', '4h', '8h', '12h', 'D'];

  @Input() title: string = 'Market Analytics';
  @Input() chartsData: AnalyticsChartsData | null = null;
  @Input() currentTab: AnalyticsTab | null = null;

  showInfo() {
    console.log('Show info for', this.currentTab?.id);
    // Тут можно подключить диалог, как в одиночном чарте
  }
}
