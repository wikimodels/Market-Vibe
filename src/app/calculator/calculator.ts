import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';

import { NotificationService } from '../shared/services/notification.service';
import { SearchFilterComponent } from '../shared/components/search-filter/search-filter.component';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';
import { KlineCacheService } from '../shared/services/cache/kline-cache.service';

interface CalculatedCoin {
  symbol: string;
  exchanges: string[];
  category: number;
  categoryStr: string;
  logoUrl: string;
  lastPrice: number;
  positionSize: number;
}

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    SearchFilterComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './calculator.html',
  styleUrls: ['./calculator.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatorComponent implements OnInit {
  private klineCacheService = inject(KlineCacheService);
  private notificationService = inject(NotificationService);

  // Signals
  public allCalculatedCoins = signal<CalculatedCoin[]>([]);
  public isLoading = signal<boolean>(true);
  public filterText = signal<string>('');
  public usdtAmount = signal<number | null>(10);

  // Computed: filter + recalculate positionSize on every amount/filter change
  public filteredCoins = computed(() => {
    const filter = this.filterText().toLowerCase();
    const amount = this.usdtAmount() ?? 0;

    return this.allCalculatedCoins()
      .filter(coin => coin.symbol.toLowerCase().includes(filter))
      .map(coin => ({
        ...coin,
        positionSize: this._calculatePositionSize(amount, coin.lastPrice),
      }));
  });

  private _calculatePositionSize(amount: number, price: number): number {
    if (price <= 0 || amount <= 0) return 0;
    const rawSize = amount / price;
    
    if (price <= 1) {
      return Math.ceil(rawSize); // Целое число, округление вверх
    }
    if (price <= 100) { // для 1-10 и 10-100 (как обсуждали, 2 знака)
      return Math.round(rawSize * 100) / 100;
    }
    if (price <= 1000) { // от 100 до 1000 — 3 знака
      return Math.round(rawSize * 1000) / 1000;
    }
    // все что больше 1000 — 4 знака
    return Math.round(rawSize * 10000) / 10000;
  }

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    try {
      this.isLoading.set(true);

      // ─── ШАГ 1: Мастер-список из IndexedDB (coinsData) ───
      // exchanges в CoinSifter: 'binanceusdm' | 'bybit'
      const masterList = await this.klineCacheService.getCoinsData();

      if (!masterList?.length) {
        this.notificationService.error('Master coin list is empty. Please sync coins in Settings.');
        return;
      }

      // ─── ШАГ 2: Только Binance — есть 'binanceusdm', нет 'bybit' ───
      const binanceOnlyCoins = masterList.filter(coin => {
        const exs = (coin.exchanges ?? []).map((e: string) => e.toLowerCase());
        return exs.some(e => e.includes('binance')) && !exs.includes('bybit');
      });

      if (!binanceOnlyCoins.length) {
        this.notificationService.error('No Binance-only coins found. Please re-sync master list.');
        return;
      }

      // ─── ШАГ 3: Klines 1h из IndexedDB — для цен ───
      const marketData = await this.klineCacheService.getMarketData('1h');
      const priceMap = new Map<string, number>();
      if (marketData?.data?.length) {
        for (const d of marketData.data) {
          const sym = this._normalizeSymbol(d.symbol);
          const lastCandle = d.candles?.length ? d.candles[d.candles.length - 1] : null;
          if (lastCandle?.closePrice && lastCandle.closePrice > 0) {
            priceMap.set(sym, lastCandle.closePrice);
          }
        }
      }

      // ─── ШАГ 4: Собираем результат ───
      const calculated: CalculatedCoin[] = [];

      for (const coin of binanceOnlyCoins) {
        const cleanSymbol = this._normalizeSymbol(coin.symbol);
        const lastPrice = priceMap.get(cleanSymbol) ?? coin.usdPrice ?? 0;

        if (lastPrice <= 0) continue;

        calculated.push({
          symbol: cleanSymbol,
          exchanges: coin.exchanges,
          category: coin.category,
          categoryStr: this._mapCategoryToRoman(coin.category),
          logoUrl: `${cleanSymbol.toLowerCase()}.svg`,
          lastPrice,
          positionSize: 0,
        });
      }

      calculated.sort((a, b) => a.symbol.localeCompare(b.symbol));
      console.log(`[Calculator] Binance-only coins: ${calculated.length}`);

      this.allCalculatedCoins.set(calculated);
    } catch (error) {
      console.error('[Calculator] Error loading data:', error);
      this.notificationService.error('Failed to load calculator data');
    } finally {
      this.isLoading.set(false);
    }
  }


  /**
   * Normalizes exchange symbol to clean coin ticker.
   * "BTC/USDT:USDT" → "BTC", "BTCUSDT" → "BTC", "1000FLOKI/USDT" → "1000FLOKI"
   */
  private _normalizeSymbol(raw: string): string {
    if (!raw) return '';
    const base = raw.split(':')[0].split('/')[0];
    let clean = base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.endsWith('USDT') && clean.length > 4) {
      clean = clean.slice(0, -4);
    }
    return clean;
  }

  private _mapCategoryToRoman(category: number): string {
    switch (category) {
      case 1: return 'I';
      case 2: return 'II';
      case 3: return 'III';
      case 4: return 'IV';
      case 5: return 'V';
      case 6: return 'VI';
      default: return String(category);
    }
  }

  public onFilterChange(val: string) {
    this.filterText.set(val);
  }

  public onAmountChange(val: number | null) {
    this.usdtAmount.set(val !== null && val > 0 ? val : null);
  }

  public clearAmount() {
    this.usdtAmount.set(null);
  }

  public copyToClipboard(val: number, symbol: string) {
    const text = val.toString();
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success(`Copied ${symbol}: ${text}`);
    });
  }

  public formatSize(val: number, price: number): string {
    if (val === 0) return '0.00';
    if (price <= 1) {
      return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    if (price <= 100) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price <= 1000) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  public onImageError(event: Event) {
    const element = event.target as HTMLImageElement;
    (element as HTMLImageElement).src = 'assets/logo/no-name.svg';
  }
}

