import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner', // usage: <app-loading-spinner></app-loading-spinner>
  standalone: true,
  imports: [],
  templateUrl: './loading-spinner.component.html', // ✅ singular
  styleUrls: ['./loading-spinner.component.scss'], // ✅ plural
})
export class LoadingSpinnerComponent {}
