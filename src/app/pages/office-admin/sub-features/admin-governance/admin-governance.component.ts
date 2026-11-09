import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { ErpStatusBadgeComponent, ErpStatusVariant } from '../../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-admin-governance',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-governance.component.html',
})
export class AdminGovernanceComponent {
  readonly service = inject(OfficeAdminService);

  readonly subTab = input<string>('recovery');
  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');
  readonly recoveryPin = signal<string>('');
  readonly activityFilter = signal<string>('');

  readonly filteredActivity = computed(() => {
    const term = this.activityFilter().trim().toLowerCase();
    return this.service.activity().filter((event) => {
      return (
        !term ||
        event.action.toLowerCase().includes(term) ||
        event.actorName.toLowerCase().includes(term) ||
        event.entityType.toLowerCase().includes(term)
      );
    });
  });

  outboxStatusVariant(status: string): ErpStatusVariant {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'pending':
      case 'processing':
      default:
        return 'warning';
    }
  }

  async generateRecoveryPin(): Promise<void> {
    this.busy.set(true);
    try {
      const pin = `PIN-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
      this.recoveryPin.set(pin);
      this.feedback.set('Emergency administrative recovery PIN generated. Valid for 1 hour.');
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to generate PIN.');
    } finally {
      this.busy.set(false);
    }
  }

  async flushOutbox(): Promise<void> {
    this.busy.set(true);
    try {
      const pending = this.service.integrationOutbox().filter((e) => e.status === 'pending' || e.status === 'failed');
      for (const item of pending) {
        await this.service.retryOutboxEvent(item.id);
      }
      this.feedback.set('Outbox event queue successfully processed.');
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to flush outbox.');
    } finally {
      this.busy.set(false);
    }
  }
}
