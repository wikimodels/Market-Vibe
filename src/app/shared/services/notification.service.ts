import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';


/**
 * Типы уведомлений для NotificationService
 * Они соответствуют SCSS-классам в app.scss
 */
export enum NotificationType {
  Success,
  Error,
  Warning,
  Info,
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Стандартные задержки (в мс) для каждого типа
  private readonly defaultDurations = {
    [NotificationType.Success]: 3000,
    [NotificationType.Error]: 5000,
    [NotificationType.Warning]: 4000,
    [NotificationType.Info]: 3000,
  };

  constructor(private snackBar: MatSnackBar) { }

  /**
   * Показывает кастомизированный SnackBar
   * @param message Текст сообщения
   * @param type Тип (Success, Error, Warning, Info)
   * @param durationMs Опциональная задержка (перекрывает стандартную)
   */
  public show(message: string, type: NotificationType, durationMs?: number): void {
    const panelClass = this.getPanelClass(type);
    const duration = durationMs ?? this.defaultDurations[type];

    this.snackBar.open(message, 'Закрыть', {
      duration: duration,
      panelClass: [panelClass], // panelClass должен быть массивом
      verticalPosition: 'top', // (Опционально) Показываем вверху
      horizontalPosition: 'right', // (Опционально) Показываем справа
    });
  }

  /**
   * Вспомогательный метод для получения SCSS-класса по типу Enum
   */
  private getPanelClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'snackbar-success';
      case NotificationType.Error:
        return 'snackbar-error';
      case NotificationType.Warning:
        return 'snackbar-warning';
      case NotificationType.Info:
        return 'snackbar-info';
      default:
        // На случай, если будет передан некорректный тип
        return 'snackbar-info';
    }
  }

  // --- (Опционально) Упрощенные методы ---

  public success(message: string, durationMs?: number): void {
    this.show(message, NotificationType.Success, durationMs);
  }

  public error(message: string, durationMs?: number): void {
    this.show(message, NotificationType.Error, durationMs);
  }

  public warning(message: string, durationMs?: number): void {
    this.show(message, NotificationType.Warning, durationMs);
  }

  public info(message: string, durationMs?: number): void {
    this.show(message, NotificationType.Info, durationMs);
  }
}
