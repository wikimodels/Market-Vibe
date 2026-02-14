import { Injectable, inject } from '@angular/core';
import { WorkingCoin } from '../models/working-coin.model';
import { CoinLinksService } from './coin-links.service';
import { NotificationService } from './notification.service';
import { WindowManager } from '../functions/window-manager';
import { LineAlert, VwapAlert } from '../../models/alerts';

/**
 * Сервис для открытия окон с монетами
 * Объединяет: проверку селекции + построение URL + открытие окон
 */
@Injectable({
  providedIn: 'root',
})
export class CoinWindowService {
  private linksService = inject(CoinLinksService);
  private notificationService = inject(NotificationService);
  private windowManager = new WindowManager();

  /**
   * Открыть TradingView для выбранных монет
   */
  public async openTradingView(coins: WorkingCoin[] | LineAlert[] | VwapAlert[]): Promise<void> {
    if (!this.validateSelection(coins)) return;

    const urls = coins
      .map((coin) => this.linksService.tradingViewLink(coin.symbol, coin.exchanges))
      .filter((url): url is string => !!url);

    await this.windowManager.openMultiple(urls);
  }

  /**
   * Открыть CoinGlass для выбранных монет
   */
  public async openCoinGlass(coins: WorkingCoin[] | LineAlert[] | VwapAlert[]): Promise<void> {
    if (!this.validateSelection(coins)) return;

    const urls = coins
      .map((coin) => this.linksService.coinglassLink(coin.symbol, coin.exchanges))
      .filter((url): url is string => !!url);

    await this.windowManager.openMultiple(urls);
  }

  public async openCoinAnalyticsTabs(
    coins: WorkingCoin[] | LineAlert[] | VwapAlert[]
  ): Promise<void> {
    if (!this.validateSelection(coins)) return;

    const urls = coins.map((coin) => `/coin-analytics/${coin.symbol}`);

    await this.windowManager.openMultiple(urls);
  }

  /**
   * Открыть VWAP Alert Charts для выбранных монет
   */
  public async openVwapAlertCharts(
    coins: WorkingCoin[] | LineAlert[] | VwapAlert[]
  ): Promise<void> {
    if (!this.validateSelection(coins)) return;

    const urls = coins.map((coin) => `/vwap-alert-chart?symbol=${encodeURIComponent(coin.symbol)}`);

    await this.windowManager.openMultiple(urls);
  }

  /**
   * Открыть Line Alert Charts для выбранных монет
   */
  public async openLineAlertCharts(
    coins: WorkingCoin[] | LineAlert[] | VwapAlert[]
  ): Promise<void> {
    if (!this.validateSelection(coins)) return;

    const urls = coins.map((coin) => `/line-alert-chart?symbol=${encodeURIComponent(coin.symbol)}`);

    await this.windowManager.openMultiple(urls);
  }

  /**
   * Открыть одно окно (например, Bitcoin chart)
   */
  public openSingleWindow(url: string): void {
    this.windowManager.open(url);
  }

  /**
   * Закрыть все открытые окна
   */
  public closeAllWindows(): void {
    this.windowManager.closeAll();
  }

  /**
   * Получить количество открытых окон
   */
  public getOpenWindowsCount(): number {
    return this.windowManager.getOpenCount();
  }

  /**
   * Проверка: есть ли выбранные монеты
   */
  private validateSelection(coins: WorkingCoin[] | LineAlert[] | VwapAlert[]): boolean {
    if (coins.length === 0) {
      this.notificationService.info('No coins selected');
      return false;
    }
    return true;
  }
}
