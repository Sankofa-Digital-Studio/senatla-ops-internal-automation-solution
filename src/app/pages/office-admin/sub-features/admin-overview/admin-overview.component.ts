import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { ErpStatCardComponent } from '../../../../components/erp/erp-stat-card.component';
import { ErpStatusBadgeComponent, ErpStatusVariant } from '../../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, ErpStatCardComponent, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent {
  readonly service = inject(OfficeAdminService);
  readonly viewName = signal<string>('');
  readonly busy = signal<boolean>(false);

  readonly onboardingProgress = computed(() => {
    const total = this.service.employees().length;
    if (!total) return 100;
    const records = this.service.employeeOnboarding();
    const ready = records.filter(
      (r) =>
        r.criminalCheckStatus === 'clear' &&
        r.fingerprintCheckStatus === 'clear' &&
        r.medicalStatus === 'fit'
    ).length;
    return Math.round((ready / total) * 100);
  });

  readonly syncProgress = computed(() => {
    const queue = this.service.integrationOutbox();
    if (!queue.length) return 100;
    const done = queue.filter((item) => item.status === 'completed').length;
    return Math.round((done / queue.length) * 100);
  });

  readonly openIssuesCount = computed(() => {
    return this.service.issues().filter((issue) => issue.status === 'Open' || issue.status === 'Escalated').length;
  });

  activityLabel(action: string, details?: Record<string, unknown> | null): string {
    return (details?.['label'] as string) || action.replace(/_/g, ' ');
  }

  activityMethod(details?: Record<string, unknown> | null): string {
    return (details?.['method'] as string) || 'UI';
  }

  anomalyVariant(severity: string): ErpStatusVariant {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'danger';
      case 'medium':
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  async saveView(): Promise<void> {
    const name = this.viewName().trim();
    if (!name) return;
    this.busy.set(true);
    try {
      await this.service.saveCurrentView(name, { tab: 'overview' });
      this.viewName.set('');
    } finally {
      this.busy.set(false);
    }
  }

  applyView(tabName: string): void {
    window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: tabName }));
  }
}
