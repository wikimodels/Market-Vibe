import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  ComponentRef,
  EnvironmentInjector,
  createComponent,
  ApplicationRef,
  inject,
} from '@angular/core';
import { CoinPopupComponent } from '../components/coin-popup/coin-popup';
import { WorkingCoin } from '../models/working-coin.model';

@Directive({
  selector: '[appCoinHover]',
  standalone: true,
})
export class CoinHoverDirective {
  @Input('appCoinHover') coin!: WorkingCoin;

  private componentRef: ComponentRef<CoinPopupComponent> | null = null;
  private destroyTimer: any = null;

  private elementRef = inject(ElementRef);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent) {
    if (this.destroyTimer) {
      clearTimeout(this.destroyTimer);
      this.destroyTimer = null;
    }

    if (this.componentRef) return;

    this.createPopup(event);
  }

  @HostListener('mouseleave')
  onMouseLeaveHost() {
    this.scheduleDestroy();
  }

  private createPopup(mouseEvent: MouseEvent) {
    // 1. Создаем компонент
    this.componentRef = createComponent(CoinPopupComponent, {
      environmentInjector: this.injector,
    });

    // 2. Передаем данные
    this.componentRef.instance.coin.set(this.coin);

    // 3. Аттачим к DOM
    this.appRef.attachView(this.componentRef.hostView);
    const domElem = (this.componentRef.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    // 4. Форсируем рендер DOM (чтобы появились элементы img)
    this.componentRef.changeDetectorRef.detectChanges();

    // 5. Вешаем слушатели на сам попап ("мост")
    domElem.addEventListener('mouseenter', () => {
      if (this.destroyTimer) {
        clearTimeout(this.destroyTimer);
        this.destroyTimer = null;
      }
    });

    domElem.addEventListener('mouseleave', () => {
      this.scheduleDestroy();
    });

    // 6. 🔥 ВАЖНО: Считаем позицию и показываем ВНУТРИ requestAnimationFrame
    // Это гарантирует, что стили применились и размеры (width/height) больше нуля
    requestAnimationFrame(() => {
      if (!this.componentRef) return;

      // Обновляем еще раз на всякий случай
      this.componentRef.changeDetectorRef.detectChanges();

      // Теперь getBoundingClientRect() вернет реальные размеры
      this.setPosition(domElem, mouseEvent);

      // Запускаем анимацию (opacity 0 -> 1)
      this.componentRef.instance.isVisible.set(true);
      this.componentRef.changeDetectorRef.detectChanges();
    });
  }

  private setPosition(popup: HTMLElement, e: MouseEvent) {
    const popupRect = popup.getBoundingClientRect();

    // Центрируем относительно КУРСОРА
    let left = e.clientX - popupRect.width / 2;

    // Ставим НАД курсором
    // - popupRect.height: поднимаем на высоту попапа
    // - 20: запас, чтобы не перекрывать иконку под курсором
    let top = e.clientY - popupRect.height - 20;

    // Проверка границ экрана
    if (left < 10) left = 10;
    if (left + popupRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popupRect.width - 10;
    }

    // Если сверху мало места, кидаем вниз
    if (top < 10) {
      top = e.clientY + 30;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  private scheduleDestroy() {
    this.destroyTimer = setTimeout(() => {
      this.destroyPopup();
    }, 200);
  }

  private destroyPopup() {
    if (this.componentRef) {
      this.appRef.detachView(this.componentRef.hostView);
      this.componentRef.destroy();
      this.componentRef = null;
    }
  }

  ngOnDestroy() {
    if (this.destroyTimer) clearTimeout(this.destroyTimer);
    this.destroyPopup();
  }
}
