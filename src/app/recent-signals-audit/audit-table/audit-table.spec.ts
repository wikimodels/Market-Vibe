import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditTable } from './audit-table';

describe('AuditTable', () => {
  let component: AuditTable;
  let fixture: ComponentFixture<AuditTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
