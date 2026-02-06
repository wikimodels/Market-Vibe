import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';

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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TF } from '../../models/kline.model';
import { KlineCacheService } from '../../shared/services/cache/kline-cache.service';
import { CoinsDataService } from '../../shared/services/coin-data.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DataSyncService, StaleDataError } from '../services/data-sync.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

interface TfRow {
  label: TF;
  serverName: string;
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
    MatDialogModule
  ],
  templateUrl: './cache-manager.component.html',
  styleUrls: ['./cache-manager.component.scss'],
})
export class CacheManagerComponent implements OnInit, OnDestroy {
  private cacheService = inject(KlineCacheService);
  private syncService = inject(DataSyncService);
  private notification = inject(NotificationService);
  public coinsService = inject(CoinsDataService);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  public masterCoinCount = 0;

  // Global Loading States
  public isUpdatingMaster = false;
  public isCheckingLocal = false;

  private sub = new Subscription();

  // Deletion specific flags
  public isDeletingMap: Record<string, boolean> = {};
  public isDeletingAllKlines = false;
  public isDeletingCoins = false;

  public rows: TfRow[] = [
    { label: '1h', serverName: 'Bazzar', localCount: 0, serverCount: null, isLoading: false, lastUpdated: null, status: 'idle' },
    { label: '4h', serverName: 'Bizzar', localCount: 0, serverCount: null, isLoading: false, lastUpdated: null, status: 'idle' },
    { label: '8h', serverName: 'Bizzar', localCount: 0, serverCount: null, isLoading: false, lastUpdated: null, status: 'idle' },
    { label: '12h', serverName: 'Bazzar', localCount: 0, serverCount: null, isLoading: false, lastUpdated: null, status: 'idle' },
    { label: 'D', serverName: 'Bazzar', localCount: 0, serverCount: null, isLoading: false, lastUpdated: null, status: 'idle' },
  ];

  async ngOnInit() {
    this.isUpdatingMaster = true;
    this.cdr.markForCheck(); // Trigger UI

    await this.coinsService.init();

    this.sub.add(
      this.coinsService.coins$.subscribe((coins) => {
        if (coins.length > 0) {
          this.refreshLocalStats();
          this.isUpdatingMaster = false;
          this.cdr.markForCheck();
        }
      })
    );

    // Initial check
    await this.refreshLocalStats();

    // Safety timeout
    setTimeout(() => {
      if (this.masterCoinCount === 0) this.isUpdatingMaster = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  forceRefreshMasterList() {
    this.isUpdatingMaster = true;
    this.notification.info('Запрашиваю свежий список монет с сервера...');
    this.coinsService.refreshData();
    this.cdr.markForCheck();
  }

  async refreshLocalStats() {
    // If we are ALREADY checking, prevent re-entry or just handle gracefully.
    // Ideally we want to allow it but users said it "cancelled" logic.
    // For now we assume this is called often.
    this.isCheckingLocal = true;
    this.cdr.markForCheck();

    try {
      await new Promise((r) => setTimeout(r, 300)); // Visual 300ms

      const stats = await this.cacheService.getStorageStats();
      const memoryCount = this.coinsService.getCurrentCoins().length;
      this.masterCoinCount = stats.coins > 0 ? stats.coins : memoryCount;

      this.rows.forEach((row) => {
        row.localCount = stats.timeframes[row.label] || 0;
      });

      this.rows = [...this.rows]; // Array reset

    } catch (error) {
      console.error('Error checking local DB', error);
    } finally {
      this.isCheckingLocal = false;
      this.cdr.markForCheck(); // Release UI
    }
  }

  runJob(row: TfRow) {
    if (row.isLoading) return;

    row.isLoading = true;
    row.status = 'running';
    row.serverCount = null;
    row.errorMessage = '';

    this.notification.info(`Job started for ${row.label}. Please wait ~3 min.`);
    this.cdr.markForCheck();

    this.syncService.runSyncCycle(row.label).subscribe({
      next: (count) => {
        row.serverCount = count;
        row.status = 'success';
        row.lastUpdated = new Date();
        row.isLoading = false;
        this.notification.success(`Sync ${row.label} Success! Coins: ${count}`);
        this.refreshLocalStats(); // This triggers checks
        this.cdr.markForCheck();
      },
      error: (err) => {
        row.isLoading = false;
        if (err && err.isStale) {
          const staleErr = err as StaleDataError;
          row.status = 'stale';
          row.errorMessage = this.formatLag(staleErr.lagMs);
          this.notification.warning(`Warning: Data for ${row.label} is stale.`);
        } else {
          console.error(err);
          row.status = 'error';
          row.errorMessage = 'Failed';
          this.notification.error(`Sync failed for ${row.label}`);
        }
        this.cdr.markForCheck();
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

  // --- Deletion Logic with Modal ---

  async deleteTfData(tf: TF) {
    if (this.isCheckingLocal || this.isUpdatingMaster) return; // Guard

    const confirmed = await firstValueFrom(this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: `Delete ${tf} Data?`,
        message: `Are you sure you want to delete all cached candles for the ${tf} timeframe? This action cannot be undone.`,
        confirmLabel: 'DELETE',
        isDanger: true
      }
    }).afterClosed());

    if (!confirmed) return;

    this.isDeletingMap[tf] = true;
    this.cdr.markForCheck();

    try {
      await this.cacheService.deleteMarketData(tf);
      this.notification.success(`Deleted ${tf} Kline Data from IndexedDB`);
      await this.refreshLocalStats();
    } catch (e) {
      this.notification.error(`Failed to delete ${tf} data`);
      console.error(e);
    } finally {
      this.isDeletingMap[tf] = false;
      this.cdr.markForCheck();
    }
  }

  async deleteAllKlines() {
    if (this.isCheckingLocal || this.isUpdatingMaster) return;

    const confirmed = await firstValueFrom(this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete ALL Kline Data?',
        message: 'This will completely wipe the IndexedDB cache for ALL timeframes. You will need to resync everything.',
        confirmLabel: 'NUKE IT',
        isDanger: true
      }
    }).afterClosed());

    if (!confirmed) return;

    this.isDeletingAllKlines = true;
    this.cdr.markForCheck();

    try {
      const tfs: TF[] = ['1h', '4h', '8h', '12h', 'D'];
      await Promise.all(tfs.map(tf => this.cacheService.deleteMarketData(tf)));

      this.notification.success('All Kline cache deleted!');
      await this.refreshLocalStats();
    } catch (e) {
      this.notification.error('Failed to clear Kline database');
    } finally {
      this.isDeletingAllKlines = false;
      this.cdr.markForCheck();
    }
  }

  async deleteCoinsList() {
    if (this.isCheckingLocal || this.isUpdatingMaster) return;

    const confirmed = await firstValueFrom(this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Master Coin List?',
        message: 'This removes the list of trackable coins. You will need to click "Download List" again to restore it.',
        confirmLabel: 'DELETE LIST',
        isDanger: true
      }
    }).afterClosed());

    if (!confirmed) return;

    this.isDeletingCoins = true;
    this.cdr.markForCheck();

    try {
      await this.cacheService.clearCoinsData();
      this.masterCoinCount = 0;
      this.notification.success('Master Coin List deleted.');
      await this.refreshLocalStats();
    } catch (e) {
      this.notification.error('Failed to delete Coins list');
    } finally {
      this.isDeletingCoins = false;
      this.cdr.markForCheck();
    }
  }
}
