import { Component, inject, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatRipple } from '@angular/material/core';
// 🚀 ДОБАВЛЕНО: Dialog Module и компонент
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WorkingCoin } from '../../models/working-coin.model';
import { CoinLinksService } from '../../services/coin-links.service';
import { GenericSelectionService } from '../../services/generic.selection.service';
import { LinksComponent } from '../links/links.component';

@Component({
  selector: 'app-coin-item',
  standalone: true,
  imports: [
    CommonModule,
    MatRipple,
    LinksComponent,
    // 🚀 ДОБАВЛЕНО:
    MatDialogModule,
  ],
  templateUrl: './coin-item.component.html',
  styleUrls: ['./coin-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinItemComponent {
  private linksService = inject(CoinLinksService);
  private selectionService = inject(GenericSelectionService<WorkingCoin>);
  // 🚀 ДОБАВЛЕНО: Inject Dialog
  private dialog = inject(MatDialog);

  coin = input.required<WorkingCoin>();

  private selectionSignal = toSignal(this.selectionService.selectionChanges$, { initialValue: [] });
  public isSelected = computed(() => this.selectionSignal().includes(this.coin()));

  tvLink = computed(() =>
    this.linksService.tradingViewLink(this.coin().symbol, this.coin().exchanges)
  );
  cgLink = computed(() =>
    this.linksService.coinglassLink(this.coin().symbol, this.coin().exchanges)
  );
  hasBinance = computed(() =>
    this.coin().exchanges.some((ex) => ex.toLowerCase().includes('binance'))
  );
  hasBybit = computed(() => this.coin().exchanges.some((ex) => ex.toLowerCase().includes('bybit')));
  binanceLink = computed(() => this.linksService.exchangeLink(this.coin().symbol, 'Binance'));
  bybitLink = computed(() => this.linksService.exchangeLink(this.coin().symbol, 'Bybit'));
  binanceLogo = computed(() => this.linksService.exchangeLogoLink('Binance'));
  bybitLogo = computed(() => this.linksService.exchangeLogoLink('Bybit'));
  tvLogo = computed(() => 'assets/icons/tv.svg');
  cgLogo = computed(() => 'assets/icons/coinglass.svg');

  public onImageError(event: Event) {
    const element = event.target as HTMLImageElement;
    element.src = 'assets/logo/no-name.svg';
  }

  public onPillClick(): void {
    this.selectionService.toggle(this.coin());
  }

  // 🚀 НОВЫЙ МЕТОД: Открытие диалога при клике на лого
  public clickLogo(event: MouseEvent): void {
    event.stopPropagation(); // Не выделять строку

    // this.dialog.open(NewLineAlert, {
    //   width: '500px',
    //   data: { coin: this.coin() },
    //   panelClass: 'custom-dialog-container', // Опционально для глобальных стилей
    // });
  }

  public clickBinance(event: MouseEvent): void {
    event.stopPropagation();
    if (this.binanceLink()) window.open(this.binanceLink(), '_blank');
  }

  public clickBybit(event: MouseEvent): void {
    event.stopPropagation();
    if (this.bybitLink()) window.open(this.bybitLink(), '_blank');
  }

  public clickTv(event: MouseEvent): void {
    event.stopPropagation();
    if (this.tvLink()) window.open(this.tvLink(), '_blank');
  }

  public clickCg(event: MouseEvent): void {
    event.stopPropagation();
    if (this.cgLink()) window.open(this.cgLink(), '_blank');
  }
}
