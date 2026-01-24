import { Directive, ElementRef, HostListener, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Directive({
  selector: '[appScrollToTop]',
  standalone: true,
})
export class ScrollToTopDirective {
  private btn: HTMLElement | null = null;
  private isShown = false;
  private threshold = 300;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  @HostListener('scroll', ['$event'])
  onScroll(event: Event) {
    // Проверяем скролл самого элемента
    const scrollTop = this.el.nativeElement.scrollTop;
    // Или проверяем скролл родителя (на случай если скроллится обертка Material)
    const parentScroll = this.el.nativeElement.parentElement?.scrollTop || 0;

    // Берем максимальное значение
    const currentScroll = Math.max(scrollTop, parentScroll, window.scrollY);

    if (currentScroll > this.threshold && !this.isShown) {
      this.showButton();
    } else if (currentScroll <= this.threshold && this.isShown) {
      this.hideButton();
    }
  }

  private showButton() {
    if (!this.btn) {
      this.createButton();
    }
    this.isShown = true;
    this.renderer.addClass(this.btn, 'show');
  }

  private hideButton() {
    this.isShown = false;
    if (this.btn) {
      this.renderer.removeClass(this.btn, 'show');
    }
  }

  private createButton() {
    this.btn = this.renderer.createElement('button');
    this.renderer.addClass(this.btn, 'scroll-to-top-btn');

    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'arrow-up');
    this.renderer.appendChild(this.btn, icon);

    this.renderer.listen(this.btn, 'click', () => {
      // 1. Скроллим сам элемент
      this.el.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });

      // 2. Скроллим Window
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 3. "Ядерный вариант": Идем по всем родителям и скроллим их в 0
      // Это найдет скрытый контейнер Angular Material и вернет его наверх
      let parent = this.el.nativeElement.parentElement;
      while (parent) {
        if (parent.scrollTop > 0) {
          // Используем try-catch на случай элементов, не поддерживающих scrollTo
          try {
            parent.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (e) {
            parent.scrollTop = 0; // Fallback для старых браузеров
          }
        }
        parent = parent.parentElement;
      }
    });

    // Добавляем кнопку в body, чтобы она была независима от scss-контейнеров
    this.renderer.appendChild(this.document.body, this.btn);
  }
}
