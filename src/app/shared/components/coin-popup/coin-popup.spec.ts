import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinPopup } from './coin-popup';

describe('CoinPopup', () => {
  let component: CoinPopup;
  let fixture: ComponentFixture<CoinPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoinPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoinPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
