import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

// Components
import { BtcScannerComponent } from './btc-scanner/btc-scanner.component';
import { DocViewerComponent } from './doc-viewer/doc-viewer.component';
import { UniversalScannerComponent } from './universal-scanner/universal-scanner.component';

// Data & Config
import { CoinsDataService } from '../shared/services/coin-data.service';
import { ANALYTICS_REGISTRY, AnalyticsRegistryItem } from './data/analytics.registry';
import { ScrollToTopDirective } from '../shared/directives/scroll-to-top.directive';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    UniversalScannerComponent,
    BtcScannerComponent,
    DocViewerComponent,
    ScrollToTopDirective,
    LoadingSpinnerComponent,
  ],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.scss', '../../styles/scanner-theme.scss'],
})
export class Analytics implements OnInit {
  private coinsService = inject(CoinsDataService);

  // Реестр настроек
  registry = ANALYTICS_REGISTRY;

  // Ключи, отсортированные по алфавиту (A-Z) по названию метрики (label)
  registryKeys = Object.keys(ANALYTICS_REGISTRY).sort((a, b) =>
    ANALYTICS_REGISTRY[a].label.localeCompare(ANALYTICS_REGISTRY[b].label)
  );

  // Текущая выбранная метрика (первая по алфавиту или дефолтная)
  selectedKey: string = this.registryKeys[0];

  // Потоки данных
  coins$ = this.coinsService.coins$;
  isLoading$ = this.coinsService.isLoading$;

  ngOnInit() {
    this.coinsService.init();
  }

  selectMetric(key: string) {
    this.selectedKey = key;
  }

  get currentItem(): AnalyticsRegistryItem {
    return this.registry[this.selectedKey];
  }
}
