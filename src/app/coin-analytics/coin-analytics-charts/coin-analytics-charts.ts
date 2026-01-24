import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsModule } from 'ngx-echarts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

// 🚀 Импорты твоих сервисов и компонентов
// (Убедись, что пути правильные относительно этого файла)
import { DocLoaderService } from '../../shared/services/doc-loader.service';

// Если интерфейс в отдельном файле:
import { AnalyticsTab } from '../../models/analytics-tab.model';
import { ChartInfoDialogComponent } from '../../shared/components/chart-info-dialog/chart-info-dialog.component';
import { AnalyticsChartsData } from '../../models/analytics-charts-data.model';

// Если интерфейса нет, раскомментируй строку ниже:
// export interface AnalyticsTab { id: string; label: string; hasChart: boolean; }

@Component({
  selector: 'app-coin-analytics-charts',
  standalone: true,
  imports: [CommonModule, MatTabsModule, NgxEchartsModule, MatButtonModule, MatIconModule],
  templateUrl: './coin-analytics-charts.html',
  styleUrls: ['./coin-analytics-charts.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinAnalyticsCharts {
  private dialog = inject(MatDialog);
  private docLoader = inject(DocLoaderService);

  @Input() title: string = '';
  @Input() chartsData: AnalyticsChartsData | null = null;

  // 🚀 ИСПРАВЛЕНИЕ: Добавляем Input, чтобы родитель мог передать таб
  @Input() currentTab: AnalyticsTab | null = null;

  async showInfo() {
    // Если таб не передан или у него нет ID, ничего не делаем
    if (!this.currentTab?.id) return;

    // Формируем путь: assets/html/z-velocity.html
    const filePath = `assets/html/${this.currentTab.id}.html`;

    try {
      // Загружаем HTML файл
      const htmlContent = await firstValueFrom(this.docLoader.loadDoc(filePath));

      // Открываем диалог
      this.dialog.open(ChartInfoDialogComponent, {
        // Настройки полосы (80% ширина, 100% высота)
        width: '80vw',
        height: '100vh',
        maxWidth: 'none',
        maxHeight: 'none',
        panelClass: 'central-strip-modal', // Класс из styles.scss

        data: {
          title: this.currentTab.label, // Заголовок из таба
          content: htmlContent, // Загруженный HTML
        },
      });
    } catch (err) {
      console.error('Error loading info doc:', err);
    }
  }
}
