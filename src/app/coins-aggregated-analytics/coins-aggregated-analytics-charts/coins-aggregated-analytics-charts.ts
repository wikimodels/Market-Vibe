import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsModule } from 'ngx-echarts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { AnalyticsChartsData } from '../../models/analytics-charts-data.model';
import { AnalyticsTab } from '../../models/analytics-tab.model';
import { SignalIntensityTableComponent } from '../signal-intensity-table/signal-intensity-table.component';
import { ChartInfoDialogComponent } from '../../shared/components/chart-info-dialog/chart-info-dialog.component';
import { WidgetInfoContentService } from '../../shared/services/widget-info-content.service';

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
  private dialog = inject(MatDialog);
  private widgetInfoService = inject(WidgetInfoContentService);

  // Список таймфреймов для генерации табов в шаблоне
  public readonly timeframes = ['1h', '4h', '8h', '12h', 'D'];

  @Input() title: string = 'Market Analytics';
  @Input() chartsData: AnalyticsChartsData | null = null;
  @Input() currentTab: AnalyticsTab | null = null;

  showInfo() {
    if (!this.currentTab?.id) {
      console.warn('No current tab ID available');
      return;
    }

    const widgetId = this.currentTab.id;

    // Subscribe to content loading
    this.widgetInfoService.getContent(widgetId).subscribe(content => {
      this.dialog.open(ChartInfoDialogComponent, {
        data: { content },
        width: '90vw',
        maxWidth: '95vw',
        height: '100vh',
        panelClass: 'dark-theme-dialog',
      });
    });
  }
}
