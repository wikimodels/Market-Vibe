import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SignalRow {
  name: string;
  type: 'bearish' | 'bullish' | 'neutral';
  values: number[]; // Последние 20 свечей
}

@Component({
  selector: 'app-signal-intensity-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="signal-table-container">
      <div class="table-wrapper">
        <table class="signal-table">
          <thead>
            <tr>
              <th class="signal-name-header" (click)="sortByName()">
                <span>Signal Name {{ sortColumn === 'name' ? (sortAsc ? '▲' : '▼') : '⬍' }}</span>
              </th>
              <th *ngFor="let label of columnLabels; let i = index" 
                  (click)="sortByColumn(i)"
                  [class.current-candle]="i === 0">
                <span>{{ label }}</span>
                <span class="sort-indicator" *ngIf="sortColumn === i">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of sortedRows" [class]="'signal-row ' + row.type">
              <td class="signal-name">{{ row.name }}</td>
              <td *ngFor="let value of row.values; let i = index" 
                  [class.zero-cell]="value === 0"
                  [class.current-candle]="i === 0">
                <span *ngIf="value > 0">{{ value }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .signal-table-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #0a0a0a;
      border-radius: 8px;
      overflow: hidden;
    }

    .table-wrapper {
      flex: 1;
      overflow: auto;
      padding: 0;
    }

    .signal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      font-family: 'Courier New', monospace;
      table-layout: fixed;
    }

    .signal-table thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #1a1a1a;
    }

    .signal-table th {
      padding: 8px 2px;
      text-align: center;
      font-weight: 600;
      color: #aaa;
      border-bottom: 2px solid #333;
      border-right: 1px solid #0f0f0f;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
      white-space: pre-line;
      font-size: 9px;
      line-height: 1.2;
      width: 35px;
      vertical-align: bottom;
    }

    .signal-table th span {
      display: block;
      white-space: pre-line;
    }

    .signal-table th:hover {
      background: #252525;
      color: #aaa;
    }

    .signal-name-header {
      text-align: left !important;
      position: sticky;
      left: 0;
      z-index: 11;
      background: #1a1a1a;
      width: 120px !important;
      min-width: 120px;
      max-width: 120px;
      padding: 6px 8px !important;
      height: auto !important;
    }

    .signal-name-header span {
      position: static !important;
      transform: none !important;
      width: auto !important;
      font-size: 9px;
    }

    .sort-indicator {
      margin-left: 4px;
      font-size: 8px;
      opacity: 0.5;
    }

    .signal-table th.current-candle {
      background: #2a2a2a;
      color: #fff;
      font-weight: bold;
    }

    .signal-table tbody tr {
      border-bottom: 1px solid #1a1a1a;
      transition: background 0.15s;
    }

    .signal-table tbody tr:hover {
      background: #1a1a1a;
    }

    .signal-table td {
      padding: 4px 2px;
      text-align: center;
      border-right: 1px solid #0f0f0f;
      font-weight: 600;
      font-size: 9px;
      width: 35px;
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .signal-name {
      text-align: left !important;
      position: sticky;
      left: 0;
      z-index: 5;
      background: inherit;
      font-weight: 600;
      padding: 4px 8px !important;
      width: 120px !important;
      min-width: 120px;
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 9px;
    }

    /* Медвежьи сигналы - тёмно-красный */
    .signal-row.bearish .signal-name {
      color: #d88;
      background: #1a0f0f;
    }

    .signal-row.bearish td {
      background: #1a0f0f;
      color: #d88;
    }

    .signal-row.bearish:hover td {
      background: #251515;
    }

    .signal-row.bearish td:hover {
      background: #301a1a !important;
      color: #faa !important;
    }

    /* Бычьи сигналы - тёмно-зелёный */
    .signal-row.bullish .signal-name {
      color: #8d8;
      background: #0f1a0f;
    }

    .signal-row.bullish td {
      background: #0f1a0f;
      color: #8d8;
    }

    .signal-row.bullish:hover td {
      background: #152515;
    }

    .signal-row.bullish td:hover {
      background: #1a301a !important;
      color: #afa !important;
    }

    /* Нейтральные сигналы */
    .signal-row.neutral .signal-name {
      color: #aaa;
      background: #0f0f0f;
    }

    .signal-row.neutral td {
      background: #0f0f0f;
      color: #aaa;
    }

    .signal-row.neutral:hover td {
      background: #1a1a1a;
    }

    .signal-row.neutral td:hover {
      background: #252525 !important;
      color: #ccc !important;
    }

    /* Нулевые значения - чёрная ячейка */
    .zero-cell {
      background: #000 !important;
      color: transparent !important;
    }

    .zero-cell:hover {
      background: #0a0a0a !important;
    }

    /* Текущая свеча */
    .current-candle {
      border-left: 2px solid #444 !important;
      border-right: 2px solid #444 !important;
    }

    /* Скроллбар */
    .table-wrapper::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    .table-wrapper::-webkit-scrollbar-track {
      background: #0a0a0a;
    }

    .table-wrapper::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 3px;
    }

    .table-wrapper::-webkit-scrollbar-thumb:hover {
      background: #444;
    }
  `]
})
export class SignalIntensityTableComponent implements OnChanges {
  @Input() data: any;

  rows: SignalRow[] = [];
  sortedRows: SignalRow[] = [];
  columnLabels: string[] = [];
  sortColumn: number | 'name' = 'name';
  sortAsc: boolean = true;

  ngOnChanges(changes: SimpleChanges) {
    console.log('🔍 [SignalTable] ngOnChanges called:', {
      hasData: !!this.data,
      dataKeys: this.data ? Object.keys(this.data) : [],
      signalsLength: this.data?.signals?.length,
      rawDataLength: this.data?.rawData?.length,
      timestampsLength: this.data?.timestamps?.length,
      firstRawData: this.data?.rawData?.[0]
    });

    if (changes['data'] && this.data) {
      this.processData();
      this.sortData();
    }
  }

  private processData() {
    console.log('🔄 [SignalTable] processData START:', {
      hasData: !!this.data,
      signals: this.data?.signals?.length,
      rawData: this.data?.rawData?.length,
      yAxis: this.data?.yAxis?.length,
      timestamps: this.data?.timestamps?.length
    });

    this.rows = [];

    // Создаём labels для колонок из timestamps
    if (this.data && this.data.timestamps && this.data.timestamps.length > 0) {
      this.columnLabels = this.data.timestamps.map((ts: number, i: number) => {
        const date = new Date(ts);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');

        // Формат: MM-DD на одной строке, HH:MM на второй
        return `${mm}-${dd}\n${hh}:${min}`;
      });
    } else {
      // Fallback если нет timestamps
      this.columnLabels = Array.from({ length: 20 }, (_, i) => {
        const offset = i - 19;
        return offset === 0 ? 'NOW' : `${offset}`;
      });
    }

    if (!this.data || !this.data.signals) return;

    // Преобразуем данные в строки
    for (let i = 0; i < this.data.signals.length; i++) {
      const signalName = this.data.yAxis[i];
      const values = this.data.rawData[i];

      // Определяем тип сигнала
      let type: 'bearish' | 'bullish' | 'neutral' = 'neutral';

      if (signalName.includes('↘') || signalName.includes('Bear') ||
        signalName.includes('Short') || signalName.includes('Liq') ||
        signalName.includes('Top') || signalName.includes('MeanRev')) {
        type = 'bearish';
      } else if (signalName.includes('↗') || signalName.includes('Bull') ||
        signalName.includes('Long') || signalName.includes('Bottom') ||
        signalName.includes('Trend Start')) {
        type = 'bullish';
      }

      this.rows.push({
        name: signalName,
        type: type,
        values: values
      });
    }

    console.log('✅ [SignalTable] processData DONE:', {
      rowsCreated: this.rows.length,
      firstRow: this.rows[0],
      columnLabels: this.columnLabels.length
    });
  }

  sortByName() {
    if (this.sortColumn === 'name') {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = 'name';
      this.sortAsc = true;
    }
    this.sortData();
  }

  sortByColumn(colIndex: number) {
    if (this.sortColumn === colIndex) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = colIndex;
      this.sortAsc = false; // По умолчанию DESC для чисел
    }
    this.sortData();
  }

  private sortData() {
    this.sortedRows = [...this.rows];

    if (this.sortColumn === 'name') {
      // Сортировка по имени: сначала медвежьи, потом бычьи, потом нейтральные
      this.sortedRows.sort((a, b) => {
        const typeOrder = { bearish: 0, bullish: 1, neutral: 2 };
        const typeCompare = typeOrder[a.type] - typeOrder[b.type];

        if (typeCompare !== 0) return typeCompare;

        // Внутри группы - по алфавиту
        return this.sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    } else {
      // Сортировка по колонке
      const colIdx = this.sortColumn as number;
      this.sortedRows.sort((a, b) => {
        const valA = a.values[colIdx];
        const valB = b.values[colIdx];
        return this.sortAsc ? valA - valB : valB - valA;
      });
    }
  }
}
