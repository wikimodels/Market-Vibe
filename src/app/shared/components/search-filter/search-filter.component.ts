// search-filter.component.ts
import { Component, ChangeDetectionStrategy, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-search-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule, // ← Только иконки оставили
  ],
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFilterComponent implements OnDestroy {
  @Output() searchChange = new EventEmitter<string>();

  public searchControl = new FormControl('', { nonNullable: true });
  public isFocused = false; // ← Для placeholder анимации

  private searchSubscription: Subscription;

  constructor() {
    this.searchSubscription = this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => {
        this.searchChange.emit(value);
      });
  }

  public clearSearch(): void {
    this.searchControl.setValue('');
    this.searchChange.emit('');
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }
}
