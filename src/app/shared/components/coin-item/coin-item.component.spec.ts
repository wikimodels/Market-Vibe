import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinItem } from './coin-item.component';

describe('CoinItem', () => {
  let component: CoinItem;
  let fixture: ComponentFixture<CoinItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoinItem],
    }).compileComponents();

    fixture = TestBed.createComponent(CoinItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
