import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompactCoinItem } from './compact-coin-item';

describe('CompactCoinItem', () => {
  let component: CompactCoinItem;
  let fixture: ComponentFixture<CompactCoinItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompactCoinItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompactCoinItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
