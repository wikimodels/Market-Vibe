import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkingCoin } from '../../../shared/models/working-coin.model';
import { CoinItemComponent } from '../../../shared/components/coin-item/coin-item.component';
import {
  CoinsService,
  PRICE_CHANGE_COLS,
  PriceChangeCol,
} from '../../services/coins.service';

export type TableSortKey = 'symbol' | PriceChangeCol;
export type TableSortDir = 'asc' | 'desc';

interface CoinRow {
  coin: WorkingCoin;
  changes: Record<PriceChangeCol, number | null>;
}

const EMPTY_CHANGES: Record<PriceChangeCol, number | null> = {
  '1h': null,
  '4h': null,
  '8h': null,
  '12h': null,
  '1d': null,
};

@Component({
  selector: 'app-coins-table',
  standalone: true,
  imports: [CommonModule, CoinItemComponent],
  templateUrl: './coins-table.html',
  styleUrls: ['./coins-table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsTableComponent implements OnInit {
  /** Монеты от родителя (уже с учётом поиска). */
  coins = input<WorkingCoin[]>([]);

  private coinsService = inject(CoinsService);

  readonly cols = PRICE_CHANGE_COLS;

  changes = signal<Map<string, Record<PriceChangeCol, number | null>>>(new Map());
  loadingChanges = signal<boolean>(true);
  sortKey = signal<TableSortKey>('symbol');
  sortDir = signal<TableSortDir>('asc');
  showScrollTop = signal<boolean>(false);

  @ViewChild('wrap') private wrap?: ElementRef<HTMLElement>;

  rows = computed<CoinRow[]>(() => {
    const list = this.coins();
    const ch = this.changes();
    const key = this.sortKey();
    const mul = this.sortDir() === 'asc' ? 1 : -1;

    const rows = list.map((c) => ({
      coin: c,
      changes: ch.get(c.symbol) ?? { ...EMPTY_CHANGES },
    }));

    rows.sort((a, b) => {
      if (key === 'symbol') {
        return a.coin.symbol.localeCompare(b.coin.symbol) * mul;
      }
      const av = a.changes[key];
      const bv = b.changes[key];
      if (av == null && bv == null) return a.coin.symbol.localeCompare(b.coin.symbol);
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * mul || a.coin.symbol.localeCompare(b.coin.symbol);
    });

    return rows;
  });



  async ngOnInit(): Promise<void> {
    try {
      this.changes.set(await this.coinsService.getPriceChanges());
    } catch (error) {
      console.error('❌ CoinsTable: Ошибка загрузки изменений цены', error);
    } finally {
      this.loadingChanges.set(false);
    }
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.showScrollTop.set(el.scrollTop > 250);
  }

  scrollToTop(): void {
    this.wrap?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSort(key: TableSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  arrow(key: TableSortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  fmt(v: number | null): string {
    if (v == null || !isFinite(v)) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  }

  cls(v: number | null): string {
    if (v == null) return '';
    return v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  }
}
