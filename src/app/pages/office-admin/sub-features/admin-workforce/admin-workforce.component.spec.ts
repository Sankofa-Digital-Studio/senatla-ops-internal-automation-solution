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

  it('manages designation baseline rates and supports updating rates', () => {
    expect(component.service.getBaselineRate('Supervisor')).toBe(350);
    expect(component.service.getBaselineRate('Team Leader')).toBe(280);
    expect(component.service.getBaselineRate('Boilermaker')).toBe(320);
    expect(component.service.getBaselineRate('General Worker')).toBe(180);

    component.startEditRate('Boilermaker', 320);
    expect(component.editingRole()).toBe('Boilermaker');
    expect(component.editingRateValue()).toBe(320);

    component.editingRateValue.set(340);
    component.saveEditRate('Boilermaker');
    expect(component.service.getBaselineRate('Boilermaker')).toBe(340);
    expect(component.editingRole()).toBeNull();
  });

  it('handles role change and custom rate override in employee onboarding wizard', () => {
    component.openAddModal();
    expect(component.newEmployee.role).toBe('General Worker');
    expect(component.newEmployee.hasRateOverride).toBeFalse();

    component.onRoleChange('Boilermaker');
    expect(component.newEmployee.role).toBe('Boilermaker');
    expect(component.newEmployee.hourlyRate).toBe(component.service.getBaselineRate('Boilermaker'));

    component.toggleRateOverride(true);
    expect(component.newEmployee.hasRateOverride).toBeTrue();

    component.onOverrideRateChange(360);
    expect(component.newEmployee.rateOverride).toBe(360);
    expect(component.newEmployee.basicRate).toBe(360 * 8);

    component.toggleRateOverride(false);
    expect(component.newEmployee.hasRateOverride).toBeFalse();
    expect(component.newEmployee.hourlyRate).toBe(component.service.getBaselineRate('Boilermaker'));
  });
});
