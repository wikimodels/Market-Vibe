import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { WorkingCoin } from '../../models/working-coin.model';
import { GenericSelectionService } from '../../services/generic.selection.service';
import { CoinHoverDirective } from '../../directives/coin-hover.directive';

@Component({
  selector: 'app-compact-coin-item',
  standalone: true,
  imports: [CommonModule, MatRippleModule, CoinHoverDirective], // ✅
  templateUrl: './compact-coin-item.html',
  styleUrls: ['./compact-coin-item.scss'],
})
export class CompactCoinItem {
  private selectionService = inject(GenericSelectionService<WorkingCoin>);
  public coin = input.required<WorkingCoin>();

  public shortSymbol = computed(() => this.coin().symbol.replace('USDT', ''));
  // Нужен для селекта
  public isSelected = computed(() => false); // Допиши свою логику выбора, если надо

  public onPillClick() {
    this.selectionService.toggle(this.coin());
  }

  public onImageError(e: Event) {
    (e.target as HTMLImageElement).src = 'assets/logo/no-name.svg';
  }
}
