import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentSignalsAudit } from './recent-signals-audit';

describe('RecentSignalsAudit', () => {
  let component: RecentSignalsAudit;
  let fixture: ComponentFixture<RecentSignalsAudit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentSignalsAudit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentSignalsAudit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
