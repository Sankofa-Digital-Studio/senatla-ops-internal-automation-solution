import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { ErpExportFormat, ErpExportTriggerComponent } from '../../../../components/erp/erp-export-trigger.component';
import { ErpExportService } from '../../../../core/services/erp-export.service';
import { ErpStatusBadgeComponent } from '../../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-admin-timesheets',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpExportTriggerComponent, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-timesheets.component.html',
})
export class AdminTimesheetsComponent {
  readonly service = inject(OfficeAdminService);
  private readonly exportService = inject(ErpExportService);

  readonly timesheetDate = signal<string>(new Date().toISOString().slice(0, 10));
  readonly timesheetSiteId = signal<string>('');
  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');

  readonly timesheetRows = computed(() => {
    const siteId = this.timesheetSiteId();
    const date = this.timesheetDate();
    return this.service.employees().filter((emp) => !siteId || emp.siteId === siteId).map((emp) => {
      const log = emp.logs?.[date] || { status: 'absent' };
      return {
        id: emp.id,
        name: `${emp.surname}, ${emp.firstName}`,
        role: emp.role,
        siteName: this.service.getSiteName(emp.siteId),
        status: log.status,
        reason: log.reason || '-',
        comment: log.comment || '',
        isFlagged: !!log.isFlagged,
      };
    });
  });

  readonly attendanceSummary = computed(() => {
    const rows = this.timesheetRows();
    const present = rows.filter((r) => r.status === 'present').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const flagged = rows.filter((r) => r.isFlagged).length;
    return { present, absent, pending, flagged, total: rows.length };
  });

  async onExportRequested(format: ErpExportFormat): Promise<void> {
    this.busy.set(true);
    try {
      await this.exportService.export(format, {
        filename: `timesheets_${this.timesheetDate()}`,
        title: `Timesheet Register - ${this.timesheetDate()}`,
        subtitle: `Site: ${this.timesheetSiteId() ? this.service.getSiteName(this.timesheetSiteId()) : 'All Sites'}`,
        columns: [
          { header: 'Employee', key: 'name' },
          { header: 'Role', key: 'role' },
          { header: 'Site', key: 'siteName' },
          { header: 'Attendance', key: 'status' },
          { header: 'Reason', key: 'reason' },
          { header: 'Comment', key: 'comment' },
        ],
        data: this.timesheetRows(),
      });
      this.feedback.set(`Export generated successfully.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Export failed.');
    } finally {
      this.busy.set(false);
    }
  }

  async markAttendance(employeeId: string, status: 'present' | 'absent'): Promise<void> {
    const emp = this.service.employees().find((e) => e.id === employeeId);
    if (!emp) return;

    this.busy.set(true);
    try {
      const logs = { ...(emp.logs || {}) };
      logs[this.timesheetDate()] = {
        date: this.timesheetDate(),
        status,
        lastUpdated: new Date(),
      };
      await this.service.saveEmployee({ ...emp, logs });
      this.feedback.set(`Attendance marked as ${status} for ${emp.firstName} ${emp.surname}.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to update attendance.');
    } finally {
      this.busy.set(false);
    }
  }
}
