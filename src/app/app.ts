import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
// ❌ toSignal больше не нужен, так как мы управляем isLoading вручную
// import { toSignal } from '@angular/core/rxjs-interop';

// --- МОДЕЛИ ---
import { Candle } from './models/kline.model';

// --- ПАЙПЫ ---

// --- СЕРВИСЫ (с правильными путями) ---
import { MobileDetectionService } from './shared/services/mobile-detection.service';

// --- АНИМАЦИИ ---
import { fadeDataAnimation, fadeSpinnerAnimation } from './shared/animations/fade.animation';
import { Navbar } from './navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Navbar, RouterOutlet],
  templateUrl: './app.html', // <-- Убедись, что этот файл существует
  styleUrls: ['./app.scss'],
  animations: [
    fadeSpinnerAnimation,
    fadeDataAnimation, // (Импорты из fade.animation.ts)
  ],
})
export class App implements OnInit {
  public mobileService = inject(MobileDetectionService);
  private router = inject(Router);

  ngOnInit() {
    // If mobile, force redirect to mobile-heatmap and lock it there (layout hides navbar)
    if (this.mobileService.isMobile()) {
      this.router.navigate(['/mobile-heatmap']);
    }
  }
}
