import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRipple } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-panel-button',
  standalone: true,
  imports: [CommonModule, MatRipple, MatIconModule, MatTooltip],
  templateUrl: './panel-button.component.html',
  styleUrls: ['./panel-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelButtonComponent {
  /**
   * Отключает кнопку.
   */
  @Input() disabled: boolean = false;

  /**
   * 🚀 ИЗМЕНЕНО: Принимаем путь к иконке или ее имя
   */
  @Input() iconPath: string = '';

  /**
   * 🚀 ДОБАВЛЕНО: Текст для нативного тултипа
   */
  @Input() tooltipText: string = '';

  /**
   * Сюда "передается функция".
   */
  @Output() actionClick = new EventEmitter<void>();

  /**
   * 🚀 ДОБАВЛЕНО: Проверяем, это SVG или MatIcon
   */
  public isSvgIcon = computed(() => this.iconPath.includes('.svg'));

  /**
   * Обработчик клика (без изменений).
   */
  public onClick(): void {
    if (!this.disabled) {
      this.actionClick.emit();
    }
  }
}
