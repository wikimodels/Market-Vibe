import { Component, inject, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
// ❗️ Пути могут потребовать коррекции в зависимости от того, где вы создали папку
import { WorkingCoin } from '../../models/working-coin.model';
// 🚀 ИЗМЕНЕНИЕ №1: Импортируем типы алертов
import { LineAlert, VwapAlert } from '../../../models/alerts';
import { CoinLinksService } from '../../services/coin-links.service';

// 🚀 ИЗМЕНЕНИЕ №2: Универсальный тип, который может быть любым из трех
type LinkableObject = WorkingCoin | LineAlert | VwapAlert;

@Component({
  selector: 'app-links', // <app-links>
  standalone: true,
  imports: [CommonModule],
  templateUrl: './links.component.html',
  styleUrls: ['./links.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinksComponent {
  // --- Внедрение сервисов ---
  private linksService = inject(CoinLinksService);

  // --- Входные данные ---
  // 🚀 ИЗМЕНЕНИЕ №3: Принимаем универсальный тип
  linkableObject = input.required<LinkableObject>();

  // --- Производные сигналы для ссылок (Перенесено из coin-item) ---
  tvLink = computed(() =>
    this.linksService.tradingViewLink(this.linkableObject().symbol, this.linkableObject().exchanges)
  );
  cgLink = computed(() =>
    this.linksService.coinglassLink(this.linkableObject().symbol, this.linkableObject().exchanges)
  );
  hasBinance = computed(() =>
    this.linkableObject().exchanges.some((ex) => ex.toLowerCase().includes('binance'))
  );
  hasBybit = computed(() =>
    this.linkableObject().exchanges.some((ex) => ex.toLowerCase().includes('bybit'))
  );
  binanceLink = computed(() =>
    this.linksService.exchangeLink(this.linkableObject().symbol, 'Binance')
  );
  bybitLink = computed(() => this.linksService.exchangeLink(this.linkableObject().symbol, 'Bybit'));
  binanceLogo = computed(() => this.linksService.exchangeLogoLink('Binance'));
  bybitLogo = computed(() => this.linksService.exchangeLogoLink('Bybit'));
  tvLogo = computed(() => 'assets/icons/tv-icon.svg');
  cgLogo = computed(() => 'assets/icons/cg-icon.svg');

  // --- Методы для обработки кликов (Перенесено из coin-item) ---

  public clickBinance(event: MouseEvent): void {
    event.stopPropagation(); // ❗️ Остановка всплытия остается
    if (this.binanceLink()) {
      window.open(this.binanceLink(), '_blank');
    }
  }

  public clickBybit(event: MouseEvent): void {
    event.stopPropagation(); // ❗️ Остановка всплытия остается
    if (this.bybitLink()) {
      window.open(this.bybitLink(), '_blank');
    }
  }

  public clickTv(event: MouseEvent): void {
    event.stopPropagation();
    if (this.tvLink()) {
      window.open(this.tvLink(), '_blank');
    }
  }

  public clickCg(event: MouseEvent): void {
    event.stopPropagation();
    if (this.cgLink()) {
      window.open(this.cgLink(), '_blank');
    }
  }
}
