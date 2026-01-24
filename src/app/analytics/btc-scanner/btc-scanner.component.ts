import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinData } from '../../models/coin-data.model';

@Component({
  selector: 'app-btc-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './btc-scanner.component.html',
  styleUrls: ['../../../styles/scanner-theme.scss'], // Тот же файл стилей!
})
export class BtcScannerComponent implements OnChanges {
  @Input() coins: CoinData[] = [];
  protected Math = Math;
  sortedCoins: CoinData[] = [];
  sortKey: string = 'btc_corr_1d_w30';
  sortDir: number = -1;

  ngOnChanges() {
    this.sortData();
  }

  sort(key: string) {
    if (this.sortKey === key) this.sortDir *= -1;
    else {
      this.sortKey = key;
      this.sortDir = key.includes('std') ? 1 : -1; // Для STD меньше = лучше (ASC)
    }
    this.sortData();
  }

  private sortData() {
    this.sortedCoins = [...this.coins].sort((a: any, b: any) => {
      return (a[this.sortKey] - b[this.sortKey]) * this.sortDir;
    });
  }

  // --- Хелперы цвета ---
  getCorrColor(val: number): string {
    return val >= 0 ? 'var(--c-bull)' : 'var(--c-bear)';
  }

  getStabColor(val: number): string {
    return val > 0.7 ? 'var(--c-blue)' : 'var(--c-orange)';
  }
}
