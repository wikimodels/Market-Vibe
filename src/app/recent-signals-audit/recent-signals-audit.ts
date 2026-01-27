import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuditStrategyService, StrategyConfig } from './services/audit-strategy.service';

interface SignalItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-recent-signals-audit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-signals-audit.html',
  styleUrls: ['./recent-signals-audit.scss'],
})
export class RecentSignalsAudit {
  private router = inject(Router);
  private auditService = inject(AuditStrategyService);

  // Открытие в новом табе
  public openStrategy(signal: SignalItem) {
    const urlTree = this.router.createUrlTree(['/audit-details', signal.id]);
    const url = this.router.serializeUrl(urlTree);
    window.open(url, '_blank');
  }

  // 📊 Signal Grouping Methods (matching heatmap labels exactly)

  public getEmaCrossoverSignals(): SignalItem[] {
    return [
      { id: 'ema50crossedUp', label: 'EMA50 ↗' },
      { id: 'ema50crossedDown', label: 'EMA50 ↘' },
      { id: 'ema100crossedUp', label: 'EMA100 ↗' },
      { id: 'ema100crossedDown', label: 'EMA100 ↘' },
      { id: 'ema150crossedUp', label: 'EMA150 ↗' },
      { id: 'ema150crossedDown', label: 'EMA150 ↘' },
      { id: 'kamaCrossedUp', label: 'KAMA ↗' },
      { id: 'kamaCrossedDown', label: 'KAMA ↘' },
    ];
  }

  public getBreakoutSignals(): SignalItem[] {
    return [
      { id: 'highest50crossedUp', label: 'High50 ↗' },
      { id: 'lowest50crossedDown', label: 'Low50 ↘' },
      { id: 'highest100crossedUp', label: 'High100 ↗' },
      { id: 'lowest100crossedDown', label: 'Low100 ↘' },
    ];
  }

  public getPriceActionSignals(): SignalItem[] {
    return [
      { id: 'doji', label: 'Doji' },
      { id: 'bullishEngulfing', label: 'Bull Engulf' },
      { id: 'bearishEngulfing', label: 'Bear Engulf' },
      { id: 'hammer', label: 'Hammer' },
      { id: 'pinbar', label: 'Pinbar' },
    ];
  }

  public getRvwapCrossoverSignals(): SignalItem[] {
    return [
      { id: 'rvwapCrossedUp', label: 'RVWAP ↗' },
      { id: 'rvwapCrossedDown', label: 'RVWAP ↘' },
      { id: 'rvwapUpperBand1CrossedUp', label: 'RV UB1 ↗' },
      { id: 'rvwapUpperBand1CrossedDown', label: 'RV UB1 ↘' },
      { id: 'rvwapUpperBand2CrossedUp', label: 'RV UB2 ↗' },
      { id: 'rvwapUpperBand2CrossedDown', label: 'RV UB2 ↘' },
      { id: 'rvwapLowerBand1CrossedUp', label: 'RV LB1 ↗' },
      { id: 'rvwapLowerBand1CrossedDown', label: 'RV LB1 ↘' },
      { id: 'rvwapLowerBand2CrossedUp', label: 'RV LB2 ↗' },
      { id: 'rvwapLowerBand2CrossedDown', label: 'RV LB2 ↘' },
    ];
  }

  public getBreakingIceSignals(): SignalItem[] {
    return [
      { id: 'bullishPunch', label: 'Bull Punch' },
      { id: 'bearishPunch', label: 'Bear Punch' },
    ];
  }

  public getDivergenceSignals(): SignalItem[] {
    return [
      { id: 'bullishRvwapRsiDivergence', label: 'RV-RSI Div ↗' },
      { id: 'bearishRvwapRsiDivergence', label: 'RV-RSI Div ↘' },
      { id: 'bullishRvwapVzoDivergence', label: 'RV-VZO Div ↗' },
      { id: 'bearishRvwapVzoDivergence', label: 'RV-VZO Div ↘' },
      { id: 'bullishRvwapCmfDivergence', label: 'RV-CMF Div ↗' },
      { id: 'bearishRvwapCmfDivergence', label: 'RV-CMF Div ↘' },
    ];
  }

  public getOrderFlowSignals(): SignalItem[] {
    return [
      { id: 'longAccumulation', label: 'Long Acc' },
      { id: 'shortAccumulation', label: 'Short Acc' },
      { id: 'longLiquidation', label: 'Long Liq' },
      { id: 'shortCovering', label: 'Short Cover' },
    ];
  }

  public getReversalSignals(): SignalItem[] {
    return [
      { id: 'topReversalRisk', label: 'Top Rev Risk' },
      { id: 'bottomReversalChance', label: 'Bottom Rev Risk' },
    ];
  }

  public getCmfRegimeSignals(): SignalItem[] {
    return [
      { id: 'cmfSlopeUp', label: 'CMF ↗' },
      { id: 'cmfSlopeDown', label: 'CMF ↘' },
      { id: 'trendingRegimeStart', label: 'Trend Start' },
      { id: 'meanReversionRegimeStart', label: 'MeanRev Start' },
    ];
  }

  public getVolatilitySkewSignals(): SignalItem[] {
    return [
      { id: 'volatilityExhaustion', label: 'Vol Exhaust' },
      { id: 'bullishSkewReversal', label: 'Skew Rev ↗' },
      { id: 'bearishSkewReversal', label: 'Skew Rev ↘' },
    ];
  }
}
