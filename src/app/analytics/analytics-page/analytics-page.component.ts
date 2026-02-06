import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

// Компоненты

// Данные и Конфиг
import { ANALYTICS_REGISTRY, AnalyticsRegistryItem } from '../data/analytics.registry';
import { BtcScannerComponent } from '../btc-scanner/btc-scanner.component';
import { DocViewerComponent } from '../doc-viewer/doc-viewer.component';
import { UniversalScannerComponent } from '../universal-scanner/universal-scanner.component';
import { CoinsDataService } from '../../shared/services/coin-data.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    UniversalScannerComponent,
    BtcScannerComponent,
    DocViewerComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './analytics-page.component.html',
  styleUrls: ['./analytics-page.component.scss'],
})
export class AnalyticsPageComponent implements OnInit {
  private coinsService = inject(CoinsDataService);

  // Реестр для использования в шаблоне
  registry = ANALYTICS_REGISTRY;
  // Ключи реестра для генерации меню
  registryKeys = Object.keys(ANALYTICS_REGISTRY);

  // Текущая выбранная метрика (по умолчанию MCI или любая другая)
  selectedKey: string = 'mci';

  // Поток данных монет
  coins$ = this.coinsService.coins$;
  isLoading$ = this.coinsService.isLoading$;

  ngOnInit() {
    // Инициализация загрузки данных (Кеш -> Сеть)
    this.coinsService.init();
  }

  /**
   * Выбор метрики из меню
   */
  selectMetric(key: string) {
    this.selectedKey = key;
  }

  /**
   * Геттер для получения текущего объекта конфигурации
   */
  get currentItem(): AnalyticsRegistryItem {
    return this.registry[this.selectedKey];
  }
}
