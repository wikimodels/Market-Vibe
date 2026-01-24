import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
// ❌ toSignal больше не нужен, так как мы управляем isLoading вручную
// import { toSignal } from '@angular/core/rxjs-interop';

// --- МОДЕЛИ ---
import { Candle } from './models/kline.model';

// --- ПАЙПЫ ---

// --- СЕРВИСЫ (с правильными путями) ---
// (Сервисы данных лежат в /services, а не /shared/services)

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
export class App {
  // --- Внедрение сервисов ---
}
