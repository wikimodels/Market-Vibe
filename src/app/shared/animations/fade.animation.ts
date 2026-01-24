import { trigger, transition, style, animate, animation, useAnimation } from '@angular/animations'; // <-- Добавили import'ы

// --- Базовые анимации для переиспользования ---

export const fadeIn = animation(
  [
    style({ opacity: 0, transform: 'scale(0.98)' }), // Немного уменьшим "прыжок"
    animate('{{duration}} {{easing}}', style({ opacity: 1, transform: 'scale(1)' })),
  ],
  { params: { duration: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } }
);

export const fadeOut = animation(
  [animate('{{duration}} {{easing}}', style({ opacity: 0, transform: 'scale(0.98)' }))],
  { params: { duration: '250ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } }
);

// --- Триггер для спиннера ---

export const fadeSpinnerAnimation = trigger('fadeSpinner', [
  transition(':enter', [useAnimation(fadeIn, { params: { duration: '300ms' } })]),
  transition(':leave', [useAnimation(fadeOut, { params: { duration: '250ms' } })]),
]);

// --- Триггер для данных ("Летний ветерок") ---

export const fadeDataAnimation = trigger('fadeData', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(15px)' }), // Начнем чуть ниже
    // ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ:
    // Начинаем анимацию (500ms) ПОСЛЕ задержки (250ms),
    // чтобы дождаться исчезновения спиннера.
    animate(
      '500ms 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
  transition(':leave', [
    // Данные исчезают (fade out), когда isLoading становится true
    animate(
      '200ms cubic-bezier(0.6, -0.28, 0.735, 0.045)',
      style({ opacity: 0, transform: 'translateY(-10px)' })
    ),
  ]),
]);
