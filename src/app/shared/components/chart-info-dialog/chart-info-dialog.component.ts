import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chart-info-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './chart-info-dialog.component.html',
  styleUrls: ['./chart-info-dialog.component.scss'],
})
export class ChartInfoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ChartInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}
