import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { Employee, EmployeeOnboardingRecord, EmploymentStatus, PpeIssueRecord } from '../../../../core/models/app.models';
import { ErpStatusBadgeComponent, ErpStatusVariant } from '../../../../components/erp/erp-status-badge.component';
import { ErpWorkflowStepperComponent, ErpWorkflowStep } from '../../../../components/erp/erp-workflow-stepper.component';
import { ErpModalComponent } from '../../../../components/erp/erp-modal.component';
import { DASHBOARD_SCOPE_OPTIONS, DashboardScopeId } from '../../../../core/models/dashboard-scope.models';

@Component({
  selector: 'app-admin-workforce',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpStatusBadgeComponent, ErpWorkflowStepperComponent, ErpModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-workforce.component.html',
})
export class AdminWorkforceComponent {
  readonly service = inject(OfficeAdminService);

  readonly searchTerm = signal<string>('');
  readonly selectedSiteId = signal<string>('');
  readonly selectedScope = signal<DashboardScopeId | ''>('');
  readonly dashboardScopes = DASHBOARD_SCOPE_OPTIONS;
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');

  // Add Employee Wizard Modal State
  readonly isAddModalOpen = signal<boolean>(false);
  readonly currentWizardStep = signal<number>(0);

  // Designation Rates Panel State
  readonly showRateSettings = signal<boolean>(false);
  readonly editingRole = signal<string | null>(null);
  readonly editingRateValue = signal<number>(0);

  readonly wizardSteps: ErpWorkflowStep[] = [
    { id: 'details', label: '1. Personal Details', description: 'Name, ID & designation' },
    { id: 'compliance', label: '2. Compliance & Medical', description: 'Criminal, medical & red ticket' },
    { id: 'ppe', label: '3. PPE Allocation', description: 'Boots, overalls & sizes' },
    { id: 'confirm', label: '4. Confirmation', description: 'Review & create profile' },
  ];

  newEmployee: Partial<Employee> = {
    firstName: '',
    surname: '',
    idNumber: '',
    role: 'General Worker',
    siteId: '',
    employmentStatus: 'active',
    basicRate: 250,
    startDate: new Date().toISOString().slice(0, 10),
  };

  newOnboarding: Partial<EmployeeOnboardingRecord> = {
    criminalCheckStatus: 'pending',
    fingerprintCheckStatus: 'pending',
    medicalStatus: 'pending',
    redTicketNumber: '',
  };

  newPpe: { bootSize: string; overallSize: string; safetyGlasses: boolean; earPlugs: boolean } = {
    bootSize: '8',
    overallSize: '40',
    safetyGlasses: true,
    earPlugs: true,
  };

  // Filtered employees computed
  readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const site = this.selectedSiteId();
    const scope = this.selectedScope();
    return this.service.employees().filter((emp) => {
      const matchSearch =
        !term ||
        emp.firstName.toLowerCase().includes(term) ||
        emp.surname.toLowerCase().includes(term) ||
        emp.idNumber.toLowerCase().includes(term);
      const matchSite = !site || emp.siteId === site;
      const matchScope = !scope || this.siteScope(emp.siteId) === scope;
      return matchSearch && matchSite && matchScope;
    });
  });

  siteScope(siteId: string): DashboardScopeId {
    const siteName = this.service.getSiteName(siteId).toLowerCase();
    if (siteName.includes('head')) return 'head_office';
    if (siteName.includes('underground')) return 'underground';
    if (siteName.includes('demo') || siteName.includes('rehab')) return 'demolition_rehab';
    return 'engineering';
  }

  readonly selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    if (!id) return null;
    return this.service.employees().find((e) => e.id === id) || null;
  });

  readonly selectedEmployeeOnboarding = computed(() => {
    const emp = this.selectedEmployee();
    if (!emp) return null;
    return this.service.employeeOnboarding().find((o) => o.employeeId === emp.id) || null;
  });

  readonly selectedEmployeePpe = computed(() => {
    const emp = this.selectedEmployee();
    if (!emp) return [];
    return this.service.ppeIssues().filter((p) => p.employeeId === emp.id);
  });

  statusVariant(status: EmploymentStatus | string | undefined): ErpStatusVariant {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
      case 'terminated':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  selectEmployee(id: string): void {
    this.selectedEmployeeId.set(this.selectedEmployeeId() === id ? null : id);
  }

  startEditRate(role: string, currentRate: number): void {
    this.editingRole.set(role);
    this.editingRateValue.set(currentRate);
  }

  saveEditRate(role: string): void {
    if (this.editingRateValue() > 0) {
      this.service.updateDesignationBaselineRate(role, this.editingRateValue());
      this.feedback.set(`Baseline rate for ${role} updated to R ${this.editingRateValue()} / hr.`);
    }
    this.editingRole.set(null);
  }

  cancelEditRate(): void {
    this.editingRole.set(null);
  }

  onRoleChange(newRole: string): void {
    this.newEmployee.role = newRole as any;
    this.newEmployee.designation = newRole;
    if (!this.newEmployee.hasRateOverride) {
      const baseline = this.service.getBaselineRate(newRole);
      this.newEmployee.hourlyRate = baseline;
      this.newEmployee.basicRate = baseline * 8;
    }
  }

  toggleRateOverride(enabled: boolean): void {
    this.newEmployee.hasRateOverride = enabled;
    if (enabled) {
      if (!this.newEmployee.rateOverride) {
        this.newEmployee.rateOverride = this.service.getBaselineRate(this.newEmployee.role || 'General Worker');
      }
      this.newEmployee.basicRate = (this.newEmployee.rateOverride || 0) * 8;
    } else {
      const baseline = this.service.getBaselineRate(this.newEmployee.role || 'General Worker');
      this.newEmployee.hourlyRate = baseline;
      this.newEmployee.basicRate = baseline * 8;
    }
  }

  onOverrideRateChange(rate: number): void {
    this.newEmployee.rateOverride = Number(rate) || 0;
    this.newEmployee.basicRate = (this.newEmployee.rateOverride || 0) * 8;
  }

  openAddModal(): void {
    const defaultSite = this.service.activeSites()[0]?.id || '';
    const initialRole = 'General Worker';
    const baselineRate = this.service.getBaselineRate(initialRole);
    this.newEmployee = {
      firstName: '',
      surname: '',
      idNumber: '',
      role: initialRole,
      designation: initialRole,
      siteId: defaultSite,
      employmentStatus: 'active',
      hourlyRate: baselineRate,
      hasRateOverride: false,
      rateOverride: 0,
      basicRate: baselineRate * 8,
      startDate: new Date().toISOString().slice(0, 10),
    };
    this.newOnboarding = {
      criminalCheckStatus: 'pending',
      fingerprintCheckStatus: 'pending',
      medicalStatus: 'pending',
      redTicketNumber: '',
    };
    this.currentWizardStep.set(0);
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  setWizardStep(index: number): void {
    this.currentWizardStep.set(index);
  }

  nextWizardStep(): void {
    if (this.currentWizardStep() < this.wizardSteps.length - 1) {
      this.currentWizardStep.update((s) => s + 1);
    }
  }

  prevWizardStep(): void {
    if (this.currentWizardStep() > 0) {
      this.currentWizardStep.update((s) => s - 1);
    }
  }

  async saveNewEmployee(): Promise<void> {
    if (!this.newEmployee.firstName || !this.newEmployee.surname || !this.newEmployee.idNumber) {
      this.feedback.set('First name, surname, and ID number are required.');
      return;
    }

    this.busy.set(true);
    try {
      const fullEmployee: Employee = {
        id: this.newEmployee.id || `emp-${Date.now()}`,
        firstName: this.newEmployee.firstName,
        surname: this.newEmployee.surname,
        idNumber: this.newEmployee.idNumber,
        companyNumber: this.newEmployee.companyNumber || '',
        role: this.newEmployee.role || 'General Worker',
        designation: this.newEmployee.role || 'General Worker',
        siteId: this.newEmployee.siteId || this.service.activeSites()[0]?.id || '',
        startDate: this.newEmployee.startDate || new Date().toISOString().slice(0, 10),
        basicRate: this.newEmployee.basicRate || (this.newEmployee.hasRateOverride ? (this.newEmployee.rateOverride || 0) * 8 : this.service.getBaselineRate(this.newEmployee.role || 'General Worker') * 8),
        hourlyRate: this.newEmployee.hourlyRate || this.service.getBaselineRate(this.newEmployee.role || 'General Worker'),
        hasRateOverride: !!this.newEmployee.hasRateOverride,
        rateOverride: this.newEmployee.rateOverride || undefined,
        payRateUnit: 'daily',
        safetyQualifications: [],
        additionalFields: {},
        salaryAdvances: 0,
        financials: { travel: 0, housing: 0, advance: 0 },
        logs: {},
        adjustments: {},
        employmentStatus: 'active',
      };

      await this.service.saveEmployee(fullEmployee);

      if (this.newOnboarding.criminalCheckStatus) {
        await this.service.saveEmployeeOnboarding({
          employeeId: fullEmployee.id,
          criminalCheckStatus: this.newOnboarding.criminalCheckStatus || 'pending',
          fingerprintCheckStatus: this.newOnboarding.fingerprintCheckStatus || 'pending',
          medicalStatus: this.newOnboarding.medicalStatus || 'pending',
          redTicketNumber: this.newOnboarding.redTicketNumber || '',
          redTicketIssuedAt: null,
          redTicketExpiresAt: null,
          notes: '',
        });
      }

      if (this.newPpe.bootSize) {
        await this.service.savePpeIssue({
          employeeId: fullEmployee.id,
          itemType: 'safety_boots',
          brand: 'Standard',
          size: this.newPpe.bootSize,
          unitCost: 450,
          orderDate: new Date().toISOString().slice(0, 10),
          collectionDate: null,
          status: 'ordered',
          officeConfirmedAt: null,
          officeConfirmedBy: null,
          employeeConfirmedAt: null,
          employeeConfirmedBy: null,
        });
      }

      this.closeAddModal();
      this.feedback.set(`Employee ${this.newEmployee.firstName} ${this.newEmployee.surname} created successfully.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to save employee.');
    } finally {
      this.busy.set(false);
    }
  }

  async quickToggleStatus(emp: Employee): Promise<void> {
    const nextStatus: EmploymentStatus = emp.employmentStatus === 'active' ? 'inactive' : 'active';
    this.busy.set(true);
    try {
      await this.service.updateEmployeeStatus(emp.id, nextStatus);
      this.feedback.set(`Status updated to ${nextStatus} for ${emp.firstName} ${emp.surname}.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to toggle status.');
    } finally {
      this.busy.set(false);
    }
  }
}
