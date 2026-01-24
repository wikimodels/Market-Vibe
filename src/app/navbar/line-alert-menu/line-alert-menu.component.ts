import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core'; // Обязательно для matRipple
import { Router } from '@angular/router';

@Component({
  selector: 'app-line-alert-menu',
  templateUrl: './line-alert-menu.component.html',
  styleUrls: ['../../shared/styles/_mat_menu.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatRippleModule],
})
export class LineAlertMenuComponent {
  isOpen = false;

  constructor(private router: Router, private eRef: ElementRef) {}

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  // Закрываем меню при клике вне компонента
  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  goToAlertsAtWork() {
    this.closeAndNavigate(() => {
      console.log('Navigate: Alerts at Work');
      this.router.navigate(['/working-line-alerts']);
    });
  }

  goToTriggeredAlerts() {
    this.closeAndNavigate(() => {
      console.log('Navigate: Triggered Alerts');
      this.router.navigate(['/triggered-line-alerts']);
    });
  }

  goToArchivedAlerts() {
    this.closeAndNavigate(() => {
      console.log('Navigate: Archived Alerts');
      this.router.navigate(['/archived-line-alerts']);
    });
  }

  // Хелпер: закрывает меню с небольшой задержкой, чтобы глаз успел заметить клик
  private closeAndNavigate(action: () => void) {
    setTimeout(() => {
      this.isOpen = false;
      action();
    }, 150); // 150мс задержка перед анимацией закрытия
  }
}
