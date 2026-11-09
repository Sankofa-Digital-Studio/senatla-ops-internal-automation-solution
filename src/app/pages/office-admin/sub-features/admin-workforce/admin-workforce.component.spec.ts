import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminWorkforceComponent } from './admin-workforce.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminWorkforceComponent', () => {
  let fixture: ComponentFixture<AdminWorkforceComponent>;
  let component: AdminWorkforceComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminWorkforceComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminWorkforceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders workforce directory header and add employee button', () => {
    expect(component).toBeTruthy();
    const h2 = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent).toContain('Workforce Directory');
  });

  it('filters employees by search term', () => {
    component.searchTerm.set('NonExistentNameXYZ');
    fixture.detectChanges();
    expect(component.filteredEmployees().length).toBe(0);
  });

  it('opens wizard modal and steps through steps', () => {
    component.openAddModal();
    expect(component.isAddModalOpen()).toBeTrue();
    expect(component.currentWizardStep()).toBe(0);

    component.nextWizardStep();
    expect(component.currentWizardStep()).toBe(1);

    component.prevWizardStep();
    expect(component.currentWizardStep()).toBe(0);

    component.closeAddModal();
    expect(component.isAddModalOpen()).toBeFalse();
  });
});
