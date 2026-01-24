import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

// Импортируем твои пилюли
import { CompactCoinItem } from '../../shared/components/compact-coin-item/compact-coin-item';
import { WorkingCoin } from '../../shared/models/working-coin.model';

// Интерфейс строки данных (время + список монет)
export interface AuditTableRow {
  openTime: number;
  coins: WorkingCoin[];
}

@Component({
  selector: 'app-audit-table',
  standalone: true,
  imports: [CommonModule, DatePipe, CompactCoinItem],
  templateUrl: './audit-table.html',
  styleUrls: ['./audit-table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Для производительности
})
export class AuditTable {
  // 🔥 Единственный входной параметр - массив данных
  @Input() data: AuditTableRow[] = [];
  @Input() timeframeLabel: string = ''; // Чтобы писать "No data for 1h"
}
