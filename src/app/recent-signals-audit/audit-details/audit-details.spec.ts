import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditDetails } from './audit-details';

describe('AuditDetails', () => {
  let component: AuditDetails;
  let fixture: ComponentFixture<AuditDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
