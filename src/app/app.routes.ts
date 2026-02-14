import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Router, Routes } from '@angular/router';
import { take, map } from 'rxjs';

// Компоненты
import { AuthComponent } from './auth/auth.component';

// --- GUARDS ---

// Пропускает только авторизованных. Гостей шлет на /login
const privateGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map((user) => (user ? true : router.createUrlTree(['/login']))),
  );
};

// Import Mobile Service for the guard
import { MobileDetectionService } from './shared/services/mobile-detection.service';

// Пропускает только гостей. Авторизованных шлет домой (чтобы не видели форму логина зря)
const publicGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map((user) => (user ? router.createUrlTree(['/']) : true)),
  );
};

export const routes: Routes = [
  // 1. СТРАНИЦА ВХОДА
  {
    path: 'login',
    component: AuthComponent,
    canActivate: [publicGuard],
  },

  // 2. ЗАЩИЩЕННАЯ ГРУППА МАРШРУТОВ
  // Используем пустой путь '' как контейнер для children
  {
    path: '',
    canActivate: [privateGuard], // ⛔ ОДИН гард защищает всё, что внутри
    children: [
      {
        path: 'coin-analytics/:symbol',
        loadComponent: () => import('./coin-analytics/coin-analytics').then((m) => m.CoinAnalytics),
      },
      {
        path: 'coins-aggregated-analytics',
        loadComponent: () =>
          import('./coins-aggregated-analytics/coins-aggregated-analytics').then(
            (m) => m.CoinsAggregatedAnalytics,
          ),
      },
      {
        path: 'recent-signals-audit',
        loadComponent: () =>
          import('./recent-signals-audit/recent-signals-audit').then((m) => m.RecentSignalsAudit),
      },
      {
        path: 'audit-details/:strategyId',
        loadComponent: () =>
          import('./recent-signals-audit/audit-details/audit-details').then((m) => m.AuditDetails),
      },

      {
        path: 'settings',
        loadComponent: () => import('./settings/settings').then((m) => m.Settings),
      },
      {
        path: 'mobile-heatmap',
        loadComponent: () => import('./coins-aggregated-analytics/mobile-heatmap/mobile-heatmap.component').then((m) => m.MobileHeatmapComponent),
      },
      {
        path: 'coins',
        loadComponent: () => import('./coins/coins').then((m) => m.Coins),
      },
      // Дефолтный редирект (внутри privateGuard)
      {
        path: '',
        redirectTo: 'coins',
        pathMatch: 'full',
      },
    ],
  },

  // 3. Глобальный перехватчик (404 -> на главную, а там разберутся гарды)
  { path: '**', redirectTo: '' },
];
