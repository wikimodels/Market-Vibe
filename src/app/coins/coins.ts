import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';
import { WorkingCoin } from '../shared/models/working-coin.model';
import { CoinsService } from './services/coins.service';
import { CoinItemComponent } from '../shared/components/coin-item/coin-item.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { GenericSelectionService } from '../shared/services/generic.selection.service';
import { SearchFilterComponent } from '../shared/components/search-filter/search-filter.component';
import { MatRipple } from '@angular/material/core';
import { NotificationService } from '../shared/services/notification.service';
import { CoinWindowService } from '../shared/services/coin-window.service';
import { WorkingCoinsApiService } from '../shared/services/api/working-coins-api.service';
import { PanelButtonComponent } from '../shared/components/panel-button/panel-button.component';

type SortMode = 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc';

@Component({
  selector: 'app-coins',
  standalone: true,
  imports: [
    CommonModule,
    LoadingSpinnerComponent,
    CoinItemComponent,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    SearchFilterComponent,
    PanelButtonComponent,
  ],
  templateUrl: './coins.html',
  styleUrls: ['./coins.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coins {
  // ✅ Инъекция сервисов
  private coinsService = inject(CoinsService);
  private selectionService = inject(GenericSelectionService<WorkingCoin>);
  private notificationService = inject(NotificationService);
  private coinWindowService = inject(CoinWindowService);
  private workingCoinsService = inject(WorkingCoinsApiService);

  // ✅ Состояние компонента
  public coins = signal<WorkingCoin[]>([]);
  public isLoading = signal<boolean>(true);
  public filterText = signal<string>('');
  public sortMode = signal<SortMode>('name-asc');

  private readonly bitcoinUrl = 'https://www.tradingview.com/chart?symbol=BYBIT:BTCUSDT.P';

  // ✅ Реактивные данные
  private selectionSignal = toSignal(this.selectionService.selectionChanges$, {
    initialValue: [],
  });

  public selectionCount = computed(() => this.selectionSignal().length);
  public hasSelection = computed(() => this.selectionSignal().length > 0);

  public sortIcon = computed(() => {
    const mode = this.sortMode();
    return mode === 'name-asc' || mode === 'category-asc' ? 'sort-up' : 'sort-down';
  });

  public filteredCoins = computed(() => {
    let allCoins = [...this.coins()];
    const filter = this.filterText().toLowerCase();

    // Фильтрация
    if (filter) {
      allCoins = allCoins.filter((coin) => coin.symbol.toLowerCase().includes(filter));
    }

    // Сортировка
    const mode = this.sortMode();
    if (mode === 'name-asc') {
      allCoins.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else if (mode === 'name-desc') {
      allCoins.sort((a, b) => b.symbol.localeCompare(a.symbol));
    } else if (mode === 'category-asc') {
      allCoins.sort((a, b) => a.category - b.category);
    } else if (mode === 'category-desc') {
      allCoins.sort((a, b) => b.category - a.category);
    }

    return allCoins;
  });

  constructor() {
    this.loadCoins();

    // ✅ Ограничение выбора до 7 монет
    effect(() => {
      const count = this.selectionCount();
      if (count > 7) {
        this.notificationService.warning('Max selection number is 7');
        const selected = this.selectionSignal();
        const lastCoin = selected[selected.length - 1];
        this.selectionService.deselect(lastCoin);
      }
    });
  }

  // ============================================
  // 📦 DATA LOADING
  // ============================================

  private async loadCoins() {
    try {
      this.isLoading.set(true);
      const coinData = await this.coinsService.getWorkingCoins();
      this.coins.set(coinData);
    } catch (error) {
      console.error('❌ CoinsComponent: Ошибка загрузки монет', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ============================================
  // 🔍 FILTER & SORT
  // ============================================

  public onFilterChange(filterValue: string): void {
    this.filterText.set(filterValue);
  }

  public sortOut(): void {
    const current = this.sortMode();
    const cycle: Record<SortMode, SortMode> = {
      'name-asc': 'name-desc',
      'name-desc': 'category-asc',
      'category-asc': 'category-desc',
      'category-desc': 'name-asc',
    };
    this.sortMode.set(cycle[current]);
  }

  // ============================================
  // ✅ SELECTION
  // ============================================

  public clearSelection(): void {
    this.selectionService.clear();
  }

  public toggleSelectAll(): void {
    if (this.selectionService.hasValue()) {
      this.selectionService.clear();
    } else {
      this.selectionService.select(this.filteredCoins());
    }
  }

  // ============================================
  // 🪟 WINDOW OPERATIONS (ДЕЛЕГИРУЕМ В СЕРВИС!)
  // ============================================

  public async openTradingView(): Promise<void> {
    await this.coinWindowService.openTradingView(this.selectionSignal());
  }

  public async openCoinGlass(): Promise<void> {
    await this.coinWindowService.openCoinGlass(this.selectionSignal());
  }

  public async goToVwapAlertCharts(): Promise<void> {
    await this.coinWindowService.openVwapAlertCharts(this.selectionSignal());
  }

  public async goToLineAlertCharts(): Promise<void> {
    await this.coinWindowService.openLineAlertCharts(this.selectionSignal());
  }

  public async goToCoinAnalytics(): Promise<void> {
    await this.coinWindowService.openCoinAnalyticsTabs(this.selectionSignal());
  }

  public openBitcoinChart(): void {
    this.coinWindowService.openSingleWindow(this.bitcoinUrl);
  }

  public closeWindows(): void {
    this.coinWindowService.closeAllWindows();
  }

  public addToWork(): void {
    this.workingCoinsService.addCoinsBatchAsync(this.selectionSignal());
    this.selectionService.clear();
  }

  public downloadList(): void {
    const coins = this.filteredCoins();
    const specificTickers = coins
      .map((c) => {
        const hasBybit = c.exchanges.some((ex) => ex.toLowerCase().includes('bybit'));
        const hasBinance = c.exchanges.some((ex) => ex.toLowerCase().includes('binance'));

        if (hasBybit) {
          return `BYBIT:${c.symbol}USDT.P`;
        }
        if (hasBinance) {
          return `BINANCE:${c.symbol}USDT.P`;
        }
        return null;
      })
      .filter((t): t is string => !!t);

    const text = specificTickers.join(', ');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coins_list.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
