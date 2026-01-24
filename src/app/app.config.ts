import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// 🔧 Глобальные настройки для Angular Material (пример)
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { IconsRegisterService } from './shared/services/icons-register.service';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
// 1. Импортируем ВСЮ библиотеку echarts, чтобы передать её в ядро
import * as echarts from 'echarts';
// 2. Импортируем корректный провайдер для Standalone (согласно документации v17+)
import { provideEchartsCore } from 'ngx-echarts';

export const appConfig: ApplicationConfig = {
  providers: [
    // --- Стандартная настройка ---
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideEchartsCore({ echarts }),
    // --- Формы ---
    // ✅ ПРАВИЛЬНЫЙ СПОСОБ для ReactiveFormsModule
    //importProvidersFrom(ReactiveFormsModule),

    // --- HTTP-клиент с поддержкой Interceptors ---
    provideHttpClient(withInterceptors([])),

    // --- Firebase Setup ---
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),

    // --- Init ---
    provideAppInitializer(() => {
      const register = inject(IconsRegisterService);
      return register.registerIcons();
    }),
    // --- Провайдеры для Angular Material ---
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },
  ],
};
