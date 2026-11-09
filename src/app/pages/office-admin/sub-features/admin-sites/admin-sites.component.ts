import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { Site } from '../../../../core/models/app.models';
import { ErpStatusBadgeComponent } from '../../../../components/erp/erp-status-badge.component';
import { ErpModalComponent } from '../../../../components/erp/erp-modal.component';

@Component({
  selector: 'app-admin-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpStatusBadgeComponent, ErpModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-sites.component.html',
})
export class AdminSitesComponent {
  readonly service = inject(OfficeAdminService);

  readonly searchTerm = signal<string>('');
  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');
  readonly isModalOpen = signal<boolean>(false);

  siteForm: Partial<Site> = {
    name: '',
    location: '',
    teamName: '',
    jobNumber: '',
    estimatedDuration: '',
    isActive: true,
    complianceChecklist: ['Daily Safety Briefing', 'PPE Verification', 'Permit to Work'],
  };

  readonly filteredSites = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.service.sites().filter((site) => {
      return (
        !term ||
        site.name.toLowerCase().includes(term) ||
        site.location.toLowerCase().includes(term) ||
        (site.jobNumber && site.jobNumber.toLowerCase().includes(term))
      );
    });
  });

  openCreateModal(): void {
    this.siteForm = {
      name: '',
      location: '',
      teamName: '',
      jobNumber: '',
      estimatedDuration: '',
      isActive: true,
      complianceChecklist: ['Daily Safety Briefing', 'PPE Verification', 'Permit to Work'],
    };
    this.isModalOpen.set(true);
  }

  openEditModal(site: Site): void {
    this.siteForm = { ...site };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async saveSite(): Promise<void> {
    if (!this.siteForm.name || !this.siteForm.location) {
      this.feedback.set('Site name and location are required.');
      return;
    }

    this.busy.set(true);
    try {
      await this.service.saveSite(this.siteForm as Site);
      this.closeModal();
      this.feedback.set(`Site "${this.siteForm.name}" saved successfully.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to save site.');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleSiteStatus(site: Site): Promise<void> {
    this.busy.set(true);
    try {
      await this.service.saveSite({ ...site, isActive: !site.isActive });
      this.feedback.set(`Site "${site.name}" status updated.`);
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to update site.');
    } finally {
      this.busy.set(false);
    }
  }

  sitePersonnelCount(siteId: string): number {
    return this.service.employees().filter((e) => e.siteId === siteId && e.employmentStatus === 'active').length;
  }
}
