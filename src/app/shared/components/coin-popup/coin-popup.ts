import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkingCoin } from '../../models/working-coin.model';
import { CoinLinksService } from '../../services/coin-links.service';

@Component({
  selector: 'app-coin-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coin-popup.html',
  styleUrls: ['./coin-popup.scss'],
})
export class CoinPopupComponent {
  private linksService = inject(CoinLinksService);

  // Данные приходят из директивы
  public coin = signal<WorkingCoin | null>(null);

  // Управляет классом .show для CSS-анимации
  public isVisible = signal(false);

  // 🔥 Вычисляем короткий символ (без USDT)
  public shortSymbol = computed(() => {
    const c = this.coin();
    return c ? c.symbol.replace('USDT', '') : '';
  });

  // --- Вычисляемые ссылки (передаем shortSymbol) ---
  binanceLink = computed(() =>
    this.shortSymbol() ? this.linksService.exchangeLink(this.shortSymbol(), 'Binance') : null,
  );

  bybitLink = computed(() =>
    this.shortSymbol() ? this.linksService.exchangeLink(this.shortSymbol(), 'Bybit') : null,
  );

  tvLink = computed(() =>
    this.coin() && this.shortSymbol()
      ? this.linksService.tradingViewLink(this.shortSymbol(), this.coin()!.exchanges)
      : null,
  );

  cgLink = computed(() =>
    this.coin() && this.shortSymbol()
      ? this.linksService.coinglassLink(this.shortSymbol(), this.coin()!.exchanges)
      : null,
  );

  // --- Логотипы ---
  binanceLogo = computed(() => this.linksService.exchangeLogoLink('Binance'));
  bybitLogo = computed(() => this.linksService.exchangeLogoLink('Bybit'));
  tvLogo = computed(() => 'assets/icons/tv.svg');
  cgLogo = computed(() => 'assets/icons/cg.svg');

  // Открытие ссылки
  public open(e: MouseEvent, url: string | null): void {
    e.stopPropagation();
    if (url) window.open(url, '_blank');
  }
}
