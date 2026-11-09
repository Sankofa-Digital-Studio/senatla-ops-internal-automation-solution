import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { Issue, IssueSeverity } from '../../../../core/models/app.models';
import { ErpStatusBadgeComponent, ErpStatusVariant } from '../../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-admin-issues',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-issues.component.html',
})
export class AdminIssuesComponent {
  readonly service = inject(OfficeAdminService);

  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');
  readonly statusFilter = signal<string>('');

  issueForm: Partial<Issue> = {
    siteId: '',
    reportedBy: '',
    description: '',
    category: 'Safety',
    severity: 'medium',
    status: 'Open',
    dueAt: '',
    ownerProfileId: null,
  };

  readonly filteredIssues = computed(() => {
    const filter = this.statusFilter();
    return this.service.issues().filter((issue) => !filter || issue.status === filter);
  });

  severityVariant(severity: IssueSeverity | string | undefined): ErpStatusVariant {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'neutral';
    }
  }

  statusVariant(status: Issue['status']): ErpStatusVariant {
    switch (status) {
      case 'Open':
        return 'warning';
      case 'Escalated':
        return 'danger';
      case 'Resolved':
        return 'success';
      default:
        return 'neutral';
    }
  }

  issueOwnerName(issue: Issue): string {
    if (!issue.ownerProfileId) return 'Unassigned';
    const user = this.service.users().find((u) => u.id === issue.ownerProfileId);
    return user ? user.displayName : 'Unknown';
  }

  issueSlaState(issue: Issue): string {
    if (!issue.dueAt) return 'No SLA';
    const due = new Date(issue.dueAt).getTime();
    const now = Date.now();
    if (due < now && issue.status !== 'Resolved') return 'Overdue';
    return 'On Track';
  }

  async submitIssue(): Promise<void> {
    if (!this.issueForm.description || !this.issueForm.reportedBy) {
      this.feedback.set('Please provide both reported by and description.');
      return;
    }

    this.busy.set(true);
    try {
      await this.service.saveIssue(this.issueForm as Issue);
      this.feedback.set('Issue reported and logged successfully.');
      this.issueForm = {
        siteId: '',
        reportedBy: '',
        description: '',
        category: 'Safety',
        severity: 'medium',
        status: 'Open',
        dueAt: '',
        ownerProfileId: null,
      };
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to submit issue.');
    } finally {
      this.busy.set(false);
    }
  }

  async transitionIssue(issue: Issue, toStatus: 'Escalated' | 'Resolved'): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.transitionIssue(issue.id, toStatus, 'Administrative status change');
      this.feedback.set(`Issue transitioned to ${toStatus}.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to update issue status.');
    } finally {
      this.busy.set(false);
    }
  }
}
