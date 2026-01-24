/**
 * Менеджер для управления открытыми окнами
 * Переиспользуемая утилита для работы с window.open()
 */
export class WindowManager {
  private windows: Window[] = [];

  /**
   * Открыть одно окно и добавить в трекинг
   * @param url - URL для открытия
   * @param target - Цель окна (по умолчанию '_blank')
   * @returns Открытое окно или null
   */
  public open(url: string, target: string = '_blank'): Window | null {
    const newWindow = window.open(url, target);
    if (newWindow) {
      this.windows.push(newWindow);
    }
    return newWindow;
  }

  /**
   * Открыть несколько окон с задержкой между ними
   * @param urls - Массив URL для открытия
   * @param delayMs - Задержка между окнами в миллисекундах (по умолчанию 400мс)
   */
  public async openMultiple(urls: string[], delayMs: number = 400): Promise<void> {
    for (let i = 0; i < urls.length; i++) {
      this.open(urls[i]);

      // Задержка между окнами (кроме последнего)
      if (i < urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Закрыть все открытые окна
   * @returns Количество закрытых окон
   */
  public closeAll(): number {
    let closedCount = 0;

    this.windows.forEach((win) => {
      if (win && !win.closed) {
        win.close();
        closedCount++;
      }
    });

    // Очищаем массив
    this.windows = [];
    return closedCount;
  }

  /**
   * Получить количество открытых окон
   * @returns Количество окон, которые всё ещё открыты
   */
  public getOpenCount(): number {
    return this.windows.filter((win) => win && !win.closed).length;
  }

  /**
   * Очистить закрытые окна из массива
   * Полезно для периодической очистки памяти
   */
  public cleanup(): void {
    this.windows = this.windows.filter((win) => win && !win.closed);
  }

  /**
   * Получить все открытые окна
   * @returns Массив открытых окон
   */
  public getOpenWindows(): Window[] {
    return this.windows.filter((win) => win && !win.closed);
  }

  /**
   * Закрыть конкретное окно по индексу
   * @param index - Индекс окна в массиве
   * @returns true если окно было закрыто
   */
  public closeAt(index: number): boolean {
    const win = this.windows[index];
    if (win && !win.closed) {
      win.close();
      return true;
    }
    return false;
  }
}
