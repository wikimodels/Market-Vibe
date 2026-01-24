import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScannerConfig } from '../models/scanner.config';
import { CoinData } from '../../models/coin-data.model';

@Component({
  selector: 'app-universal-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './universal-scanner.component.html',
  styleUrls: ['../../../styles/scanner-theme.scss'], // Подключаем общий SCSS
})
export class UniversalScannerComponent implements OnChanges {
  @Input() coins: CoinData[] = [];
  @Input() config!: ScannerConfig;

  // Таймфреймы для колонок
  timeframes = ['1h', '2h', '4h', '12h', '1d'];

  // Состояние сортировки
  sortedCoins: CoinData[] = [];
  sortKey: string = ''; // Текущее поле сортировки (например, 'entropy_4h')
  sortDir: number = -1; // -1 = DESC, 1 = ASC

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coins'] || changes['config']) {
      // Устанавливаем дефолтную сортировку по 4H, если ключ не выбран
      if (!this.sortKey && this.config) {
        this.sortKey = this.getKey('4h');
        // Для энтропии/фрактала лучше ASC (меньше = лучше), для остальных DESC
        this.sortDir = this.config.theme === 'lower-better' ? 1 : -1;
      }
      this.sortData();
    }
  }

  /**
   * Генерирует ключ поля данных (например: entropy_1h)
   */
  getKey(tf: string): string {
    if (!this.config) return '';
    // Собираем: prefix + '_' + tf + (optional suffix)
    return `${this.config.metricPrefix}_${tf}${this.config.suffix || ''}`;
  }

  /**
   * Получает значение из монеты по таймфрейму
   */
  getValue(coin: any, tf: string): number {
    const key = this.getKey(tf);
    return coin[key] || 0;
  }

  sort(tf: string) {
    const key = this.getKey(tf);
    if (this.sortKey === key) {
      this.sortDir *= -1; // Инвертируем
    } else {
      this.sortKey = key;
      this.sortDir = -1; // По умолчанию от большего к меньшему
      // Исключение для метрик, где "меньше = лучше"
      if (this.config.theme === 'lower-better') this.sortDir = 1;
    }
    this.sortData();
  }

  private sortData() {
    // Копируем массив, чтобы не мутировать исходник
    this.sortedCoins = [...this.coins].sort((a: any, b: any) => {
      const valA = a[this.sortKey] || 0;
      const valB = b[this.sortKey] || 0;
      return (valA - valB) * this.sortDir;
    });
  }

  // === ВИЗУАЛЬНАЯ ЛОГИКА ===

  getBarWidth(val: number): string {
    const max = this.config.max || 1.0;
    const absVal = Math.abs(val);
    const pct = Math.min((absVal / max) * 100, 100);

    if (this.config.visualType === 'diverging') {
      return `${pct / 2}%`; // Делим на 2, т.к. бар от центра
    }
    return `${pct}%`;
  }

  getBarLeft(val: number): string {
    if (this.config.visualType !== 'diverging') return '0';

    // Логика для бара от центра (50%)
    const max = this.config.max || 1.0;
    const pct = Math.min((Math.abs(val) / max) * 50, 50); // Максимум 50% ширины

    if (val >= 0) return '50%'; // Вправо от центра
    return `${50 - pct}%`; // Влево от центра
  }

  getColor(val: number): string {
    const theme = this.config.theme;

    if (theme === 'bull-bear') {
      return val >= 0 ? 'var(--c-bull)' : 'var(--c-bear)';
    }

    if (theme === 'lower-better') {
      // Примерно для Entropy/Fractal: Низкое = Синий, Высокое = Красный
      // Пороги условные, можно вынести в конфиг
      if (val < this.config.max! * 0.4) return 'var(--c-blue)';
      if (val > this.config.max! * 0.8) return 'var(--c-bear)';
      return '#b0bec5'; // Grey
    }

    if (theme === 'higher-better') {
      if (val > this.config.max! * 0.75) return 'var(--c-bull)';
      if (val < this.config.max! * 0.25) return 'var(--c-bear)';
      return '#b0bec5';
    }

    return '#fff';
  }
}
