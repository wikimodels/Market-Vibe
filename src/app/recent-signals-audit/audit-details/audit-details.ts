import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';

// Material Modules
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Custom Components & Services

import { AuditStrategyService } from '../services/audit-strategy.service';
import { SignalDataService, SignalType, Timeframe } from '../services/signal-data.service';
import { WorkingCoin } from '../../shared/models/working-coin.model';
import { AuditTable, AuditTableRow } from '../audit-table/audit-table';

export type AuditTimeframe = '1h' | '4h' | '8h' | '12h' | '1d';

@Component({
  selector: 'app-audit-details',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatButtonModule, MatIconModule, AuditTable],
  templateUrl: './audit-details.html',
  styleUrls: ['./audit-details.scss'],
})
export class AuditDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private titleService = inject(Title);
  private strategyService = inject(AuditStrategyService);
  private signalDataService = inject(SignalDataService);

  // --- Configuration ---
  public readonly timeframes: AuditTimeframe[] = ['1h', '4h', '8h', '12h', '1d'];

  // --- State ---
  public strategyId = signal<string>('');

  // Computed config based on ID (Title, Label, etc.)
  public activeConfig = computed(() => this.strategyService.getConfig(this.strategyId()));

  public isLoading = signal<boolean>(false);
  public activeTf = signal<AuditTimeframe>('1h');

  // Data Cache: Stores rows for each timeframe
  public auditDataCache = signal<Record<AuditTimeframe, AuditTableRow[]>>({
    '1h': [],
    '4h': [],
    '8h': [],
    '12h': [],
    '1d': [],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('strategyId');
    if (id) {
      this.strategyId.set(id);
      this.loadStrategyData(id);
    }
  }

  // Handle Tab Change
  public onTabChange(event: MatTabChangeEvent) {
    const label = event.tab.textLabel as AuditTimeframe;
    this.activeTf.set(label);
  }

  // Show Info Dialog (Placeholder logic)
  public showInfo() {
    console.log('Show info for strategy:', this.strategyId());
  }

  // Load Data Logic
  private async loadStrategyData(id: string) {
    this.isLoading.set(true);

    const config = this.activeConfig();
    this.titleService.setTitle(`Audit: ${config.title}`);

    // Check if this is a signal-based strategy
    const signalTypes: SignalType[] = [
      'ema50crossedUp', 'ema50crossedDown',
      'ema100crossedUp', 'ema100crossedDown',
      'ema150crossedUp', 'ema150crossedDown',
      'kamaCrossedUp', 'kamaCrossedDown',
      'lowest50crossedUp', 'lowest50crossedDown',
      'lowest100crossedUp', 'lowest100crossedDown',
      'doji', 'bullishEngulfing', 'bearishEngulfing',
      'hammer', 'pinbar',
      'rvwapCrossedUp', 'rvwapCrossedDown',
      'rvwapUpperBand1CrossedUp', 'rvwapUpperBand1CrossedDown',
      'rvwapUpperBand2CrossedUp', 'rvwapUpperBand2CrossedDown',
      'rvwapLowerBand1CrossedUp', 'rvwapLowerBand1CrossedDown',
      'rvwapLowerBand2CrossedUp', 'rvwapLowerBand2CrossedDown',
      'bullishPunch', 'bearishPunch',
      'bullishRvwapRsiDivergence', 'bearishRvwapRsiDivergence',
      'bullishRvwapVzoDivergence', 'bearishRvwapVzoDivergence',
      'bullishRvwapCmfDivergence', 'bearishRvwapCmfDivergence',
      'longAccumulation', 'shortAccumulation', 'longLiquidation', 'shortCovering',
      'topReversalRisk', 'bottomReversalChance',
      'cmfSlopeUp', 'cmfSlopeDown',
      'trendingRegimeStart', 'meanReversionRegimeStart',
      'volatilityExhaustion',
      'bullishSkewReversal', 'bearishSkewReversal'
    ];

    if (signalTypes.includes(id as SignalType)) {
      // Load real signal data
      this.loadSignalData(id as SignalType);
    } else {
      // For other strategies, use mock data
      setTimeout(() => {
        this.generateMockData();
        this.isLoading.set(false);
      }, 600);
    }
  }

  // Load Signal Data from API
  private loadSignalData(signalType: SignalType) {
    const newData: Record<AuditTimeframe, AuditTableRow[]> = {
      '1h': [],
      '4h': [],
      '8h': [],
      '12h': [],
      '1d': [],
    };

    // Load data for each timeframe
    let completedRequests = 0;
    const totalRequests = this.timeframes.length;

    this.timeframes.forEach((tf) => {
      this.signalDataService.getSignalData(signalType, tf as Timeframe).subscribe({
        next: (data) => {
          newData[tf] = data;
          completedRequests++;

          if (completedRequests === totalRequests) {
            this.auditDataCache.set(newData);
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          console.error(`Failed to load data for ${signalType} ${tf}:`, err);
          completedRequests++;

          // Even on error, check if all requests completed
          if (completedRequests === totalRequests) {
            this.auditDataCache.set(newData);
            this.isLoading.set(false);
          }
        },
      });
    });
  }

  // --- Mock Data Generator (For non-signal strategies) ---
  private generateMockData() {
    const newData: any = { ...this.auditDataCache() };

    this.timeframes.forEach((tf) => {
      const rows: AuditTableRow[] = [];
      // Generate 3-8 rows per timeframe
      const rowCount = 3 + Math.floor(Math.random() * 5);

      for (let i = 0; i < rowCount; i++) {
        rows.push({
          openTime: Date.now() - i * 3600000 * (tf === '1h' ? 1 : 4),
          coins: this.getMockCoins(2 + Math.floor(Math.random() * 5)),
        });
      }
      newData[tf] = rows;
    });

    this.auditDataCache.set(newData);
  }

  private getMockCoins(count: number): WorkingCoin[] {
    const coins: WorkingCoin[] = [];
    for (let i = 0; i < count; i++) {
      coins.push({
        symbol: i % 2 === 0 ? 'BTCUSDT' : 'ETHUSDT',
        logoUrl: i % 2 === 0 ? 'bitcoin.png' : 'ethereum.png',
        category: 1,
        categoryStr: 'L1',
        exchanges: ['Binance'],
      } as WorkingCoin);
    }
    return coins;
  }
}
