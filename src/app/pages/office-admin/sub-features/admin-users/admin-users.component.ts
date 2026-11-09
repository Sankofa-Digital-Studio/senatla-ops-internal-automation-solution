import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { AppRole, ManagedUserProfile } from '../../../../core/models/app.models';
import { UserInviteInput } from '../../../../core/models/office-admin.models';
import { ErpStatusBadgeComponent } from '../../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent {
  readonly service = inject(OfficeAdminService);
  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');

  inviteForm: UserInviteInput = {
    email: '',
    displayName: '',
    role: 'site',
  };

  async submitInvite(): Promise<void> {
    if (!this.inviteForm.email || !this.inviteForm.displayName) {
      this.feedback.set('Please provide both email and display name.');
      return;
    }
    this.busy.set(true);
    try {
      const created = await this.service.inviteUser(this.inviteForm);
      this.feedback.set(`Invitation successfully issued to ${created?.username || this.inviteForm.email}`);
      this.inviteForm = { email: '', displayName: '', role: 'site' };
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to issue invite.');
    } finally {
      this.busy.set(false);
    }
  }

  async updateUser(user: ManagedUserProfile, role: string, isActive: boolean): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.saveUser({
        ...user,
        role: role as AppRole,
        isActive,
      });
      this.feedback.set(`Access updated for ${user.displayName}.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to update user.');
    } finally {
      this.busy.set(false);
    }
  }

  async resetUserPassword(user: ManagedUserProfile): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.requestPasswordReset(user.id);
      this.feedback.set(`Password reset initiated for ${user.displayName}.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to initiate reset.');
    } finally {
      this.busy.set(false);
    }
  }

  async suspendUser(user: ManagedUserProfile): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.setUserAccessState(user.id, false);
      this.feedback.set(`User ${user.displayName} suspended.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to suspend user.');
    } finally {
      this.busy.set(false);
    }
  }

  async reactivateUser(user: ManagedUserProfile): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.setUserAccessState(user.id, true);
      this.feedback.set(`User ${user.displayName} reactivated.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to reactivate user.');
    } finally {
      this.busy.set(false);
    }
  }
}
