import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean; // If true, confirm button is red
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-container" [class.danger-mode]="data.isDanger">
      
      <div class="header">
        <div class="icon-wrapper">
            <mat-icon>{{ data.isDanger ? 'warning' : 'help' }}</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>

      <mat-dialog-content>
        <p class="message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close class="cancel-btn">
          {{ data.cancelLabel || 'CANCEL' }}
        </button>
        
        <button mat-flat-button 
                [color]="data.isDanger ? 'warn' : 'primary'" 
                [mat-dialog-close]="true"
                class="confirm-btn">
          {{ data.confirmLabel || 'CONFIRM' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-container {
      padding: 24px;
      min-width: 380px;
      background: #25252b;
      color: #fff;
      border-radius: 8px; /* MatDialog usually handles this, but good for local content */
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
    }

    .confirm-container.danger-mode .icon-wrapper {
      background: rgba(244, 67, 54, 0.15);
      color: #ef5350;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }

    .message {
      font-size: 15px;
      color: #b0b0b0;
      line-height: 1.6;
      margin: 0;
    }

    mat-dialog-content {
      padding: 0 !important; /* Reset default padding */
      margin-bottom: 32px;
    }

    mat-dialog-actions {
      padding: 0 !important;
      margin-bottom: -8px; 
      display: flex;
      gap: 12px; /* Space between buttons */
    }

    button {
      flex: 1; /* Both buttons take equal width */
      height: 44px; /* Taller, easier to hit */
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
      border-radius: 8px !important;
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) { }
}
