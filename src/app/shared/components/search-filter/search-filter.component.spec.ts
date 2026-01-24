import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchFilter } from './search-filter.component.ts';

describe('SearchFilter', () => {
  let component: SearchFilter;
  let fixture: ComponentFixture<SearchFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
