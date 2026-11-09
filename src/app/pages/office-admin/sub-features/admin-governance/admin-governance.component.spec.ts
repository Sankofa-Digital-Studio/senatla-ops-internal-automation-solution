import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminGovernanceComponent } from './admin-governance.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminGovernanceComponent', () => {
  let fixture: ComponentFixture<AdminGovernanceComponent>;
  let component: AdminGovernanceComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGovernanceComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGovernanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders recovery pin and audit log headers', () => {
    expect(component).toBeTruthy();
    const h2s = fixture.nativeElement.querySelectorAll('h2');
    const titles = Array.from(h2s).map((h: any) => h.textContent.trim());
    expect(titles).toContain('Emergency Recovery PIN');
    expect(titles).toContain('Integration Outbox');
    expect(titles).toContain('Governance & Audit Log');
  });

  it('generates recovery PIN', async () => {
    await component.generateRecoveryPin();
    expect(component.recoveryPin()).toBeTruthy();
  });
});
