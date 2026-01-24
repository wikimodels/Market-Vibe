import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CoinLinksService {
  coinglassLink(symbol: string, exchanges: string[]): string {
    // Check if "Binance" is in exchanges
    // Check if any exchange contains 'binance' (case-insensitive)
    if (exchanges.some((exchange) => exchange.toLowerCase().includes('binance'))) {
      return `https://www.coinglass.com/tv/Binance_${symbol}USDT`;
    }

    // Check if any exchange contains 'bybit' (case-insensitive) and none contain 'binance' (case-insensitive)
    if (
      exchanges.some((ex) => ex.toLowerCase().includes('bybit')) &&
      !exchanges.some((ex) => ex.toLowerCase().includes('binance'))
    ) {
      return `https://www.coinglass.com/tv/Bybit_${symbol}USDT`;
    }

    // Default case (if none of the conditions match)
    return '';
  }

  tradingViewLink(symbol: string, exchanges: string[]): string {
    // Check if any exchange contains 'bybit' (case-insensitive)
    const hasBybit = exchanges.some((ex) => ex.toLowerCase().includes('bybit'));
    // Check if any exchange contains 'binance' (case-insensitive)
    const hasBinance = exchanges.some((ex) => ex.toLowerCase().includes('binance'));

    if (hasBybit) {
      return `https://www.tradingview.com/chart?symbol=BYBIT:${symbol}USDT.P`;
    }

    if (hasBinance && !hasBybit) {
      return `https://www.tradingview.com/chart?symbol=BINANCE:${symbol}USDT.P`;
    }

    return '';
  }

  exchangeLink(symbol: string, exchange: string) {
    if (exchange.toLowerCase().includes('binance')) {
      return `https://www.binance.com/en/futures/${symbol}USDT`;
    }
    if (exchange.toLowerCase().includes('bybit')) {
      return `https://www.bybit.com/trade/usdt/${symbol}USDT`;
    }

    return '';
  }

  exchangeLogoLink(exchange: string) {
    if (exchange.toLowerCase().includes('binance')) {
      return `assets/icons/binance-black.svg`;
    }
    if (exchange.toLowerCase().includes('bybit')) {
      return `assets/icons/bybit.svg`;
    }
    return '';
  }
}
