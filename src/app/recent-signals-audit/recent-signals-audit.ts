import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuditStrategyService, StrategyConfig } from './services/audit-strategy.service';

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

  // 🔥 Получаем список стратегий прямо из сервиса
  // Больше никакого хардкода в массиве
  public strategies: StrategyConfig[] = this.auditService.getAllStrategies();

  // Открытие в новом табе
  public openStrategy(strategy: StrategyConfig) {
    // 1. Создаем дерево URL
    const urlTree = this.router.createUrlTree(['/audit-details', strategy.id]);

    // 2. Сериализуем в строку
    const url = this.router.serializeUrl(urlTree);

    // 3. Открываем (Target _blank)
    window.open(url, '_blank');
  }
}
