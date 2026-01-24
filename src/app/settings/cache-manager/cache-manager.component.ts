import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// --- Angular Material Imports ---
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TF } from '../../models/kline.model';
import { KlineCacheService } from '../../shared/services/cache/kline-cache.service';
import { CoinsDataService } from '../../shared/services/coin-data.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DataSyncService, StaleDataError } from '../services/data-sync.service';

interface TfRow {
  label: TF;
  localCount: number;
  serverCount: number | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  status: 'idle' | 'running' | 'success' | 'error' | 'stale';
  errorMessage?: string;
}

@Component({
  selector: 'app-cache-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './cache-manager.component.html',
  styleUrls: ['./cache-manager.component.scss'],
})
export class CacheManagerComponent implements OnInit, OnDestroy {
  private cacheService = inject(KlineCacheService);
  private syncService = inject(DataSyncService);
  private notification = inject(NotificationService);
  public coinsService = inject(CoinsDataService);

  public masterCoinCount = 0;

  // Флаги загрузки
  public isUpdatingMaster = false; // Загрузка с сервера (Мастер-список)
  public isCheckingLocal = false; // 🔥 Загрузка из IndexedDB (Локальная проверка)

  private sub = new Subscription();

  public displayedColumns: string[] = ['timeframe', 'localCount', 'actions', 'status'];

  public rows: TfRow[] = [
    {
      label: '1h',
      localCount: 0,
      serverCount: null,
      isLoading: false,
      lastUpdated: null,
      status: 'idle',
    },
    {
      label: '4h',
      localCount: 0,
      serverCount: null,
      isLoading: false,
      lastUpdated: null,
      status: 'idle',
    },
    {
      label: '8h',
      localCount: 0,
      serverCount: null,
      isLoading: false,
      lastUpdated: null,
      status: 'idle',
    },
    {
      label: '12h',
      localCount: 0,
      serverCount: null,
      isLoading: false,
      lastUpdated: null,
      status: 'idle',
    },
    {
      label: 'D',
      localCount: 0,
      serverCount: null,
      isLoading: false,
      lastUpdated: null,
      status: 'idle',
    },
  ];

  async ngOnInit() {
    // 1. Сразу показываем, что мы что-то делаем
    this.isUpdatingMaster = true;

    // Инициализация сервиса монет
    await this.coinsService.init();

    this.sub.add(
      this.coinsService.coins$.subscribe((coins) => {
        if (coins.length > 0) {
          this.refreshLocalStats();
          this.isUpdatingMaster = false;
        }
      })
    );

    await this.refreshLocalStats();

    // Снимаем лоадер мастера по таймауту безопасности
    setTimeout(() => {
      if (this.masterCoinCount === 0) this.isUpdatingMaster = false;
    }, 2000);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  forceRefreshMasterList() {
    this.isUpdatingMaster = true;
    this.notification.info('Запрашиваю свежий список монет с сервера...');
    this.coinsService.refreshData();
  }

  /**
   * Проверка локальной базы (IndexedDB)
   */
  async refreshLocalStats() {
    // 🔥 Включаем индикацию локальной проверки
    this.isCheckingLocal = true;

    try {
      // Искусственная микро-задержка (50мс), чтобы спиннер успел мелькнуть
      // и пользователь понял, что клик сработал, если БД отвечает мгновенно.
      await new Promise((r) => setTimeout(r, 300));

      const stats = await this.cacheService.getStorageStats();
      const memoryCount = this.coinsService.getCurrentCoins().length;
      this.masterCoinCount = stats.coins > 0 ? stats.coins : memoryCount;

      this.rows.forEach((row) => {
        row.localCount = stats.timeframes[row.label] || 0;
      });
    } catch (error) {
      console.error('Error checking local DB', error);
    } finally {
      // 🔥 Выключаем индикацию в любом случае
      this.isCheckingLocal = false;
    }
  }

  runJob(row: TfRow) {
    if (row.isLoading) return;

    row.isLoading = true;
    row.status = 'running';
    row.serverCount = null;
    row.errorMessage = '';

    this.notification.info(`Job started for ${row.label}. Please wait ~3 min.`);

    this.syncService.runSyncCycle(row.label).subscribe({
      next: (count) => {
        row.serverCount = count;
        row.status = 'success';
        row.lastUpdated = new Date();
        row.isLoading = false;
        this.notification.success(`Sync ${row.label} Success! Coins: ${count}`);
        this.refreshLocalStats(); // Обновляем локальную статистику после успеха
      },
      error: (err) => {
        row.isLoading = false;

        if (err && err.isStale) {
          const staleErr = err as StaleDataError;
          row.status = 'stale';
          const lagStr = this.formatLag(staleErr.lagMs);
          row.errorMessage = lagStr;
          console.warn(`Stale Data for ${row.label}: Lag is ${lagStr}`);
          this.notification.warning(`Warning: Data for ${row.label} is stale by ${lagStr}`);
        } else {
          console.error(err);
          row.status = 'error';
          row.errorMessage = 'Failed';
          this.notification.error(`Sync failed for ${row.label}`);
        }
      },
    });
  }

  private formatLag(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }
}
