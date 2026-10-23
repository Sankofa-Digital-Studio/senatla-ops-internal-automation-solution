import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetEvidenceFileSelection, AssetRegistrationWorkspaceComponent } from '../../components/asset-registration-workspace.component';
import { AssetOperationsComponent } from '../../components/asset-operations.component';
import {
  AssetEvidenceInput,
  AssetEvidenceType,
  AssetImportPreview,
  AssetMeterReading,
  AssetRegistrationDraft,
  AssetRegistrationEvidence,
  SENATLA_TRADING_ORGANIZATION_ID,
  VehicleAsset,
} from '../../core/models/app.models';
import { AssetRegistrationService } from '../../core/services/asset-registration.service';
import { OfficeAdminService } from '../../core/services/office-admin.service';
import { validateAssetRegistration } from '../../core/validation/asset-registration-rules';

type AssetWorkspace = 'engineering' | 'fleet';
type ReadinessState = 'ready' | 'attention' | 'blocked';
type OverlayMode = 'register' | 'import' | null;

@Component({
  selector: 'app-asset-register',
  templateUrl: './asset-register.component.html',
  styleUrls: ['./asset-register.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, AssetRegistrationWorkspaceComponent, AssetOperationsComponent],
})
export class AssetRegisterComponent {
  readonly service = inject(OfficeAdminService);
  readonly registration = inject(AssetRegistrationService);
  readonly activeWorkspace = signal<AssetWorkspace>('engineering');
  readonly overlayMode = signal<OverlayMode>(null);
  readonly manageOpen = signal(false);
  readonly saveError = signal('');
  readonly searchTerm = signal('');
  readonly lifecycleFilter = signal('all');
  readonly readinessFilter = signal('all');
  readonly siteFilter = signal('all');
  readonly page = signal(1);
  readonly pageSize = 8;
  readonly importPreview = signal<AssetImportPreview | null>(null);
  readonly importMessage = signal('');
  readonly selectedAssetId = signal('');
  readonly activeDraft = signal<AssetRegistrationDraft | null>(null);
  readonly registrationBusy = signal(false);
  readonly registrationMessage = signal('');
  readonly detailsVerified = signal(false);

  readonly workspaceAssets = computed(() => this.service.assets().filter((asset) => this.assetWorkspace(asset) === this.activeWorkspace()));
  readonly filteredAssets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const lifecycle = this.lifecycleFilter();
    const readiness = this.readinessFilter();
    const site = this.siteFilter();
    return this.workspaceAssets().filter((asset) =>
      (lifecycle === 'all' || (asset.lifecycleState || 'active') === lifecycle)
      && (readiness === 'all' || this.assetReadiness(asset) === readiness)
      && (site === 'all' || asset.assignedSiteId === site)
      && (!term || [
        asset.registrationNumber,
        asset.serialNumber,
        asset.vin,
        asset.make,
        asset.model,
        asset.assetClass,
        asset.custodianName,
        this.service.getSiteName(asset.assignedSiteId || ''),
      ].some((value) => value?.toLowerCase().includes(term))));
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAssets().length / this.pageSize)));
  readonly pagedAssets = computed(() => this.filteredAssets().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly selectedAsset = computed(() => {
    const inWorkspace = this.workspaceAssets();
    return inWorkspace.find((asset) => asset.id === this.selectedAssetId()) || inWorkspace[0] || null;
  });
  readonly selectedAssetEffectiveId = computed(() => this.selectedAsset()?.id || '');
  readonly readyCount = computed(() => this.workspaceAssets().filter((asset) => this.assetReadiness(asset) === 'ready').length);
  readonly attentionCount = computed(() => this.workspaceAssets().filter((asset) => this.assetReadiness(asset) === 'attention').length);
  readonly blockedCount = computed(() => this.workspaceAssets().filter((asset) => this.assetReadiness(asset) === 'blocked').length);
  readonly selectedWorkOrders = computed(() => this.service.assetWorkOrders().filter((order) => order.assetId === this.selectedAssetEffectiveId() && !['completed', 'cancelled'].includes(order.status)));
  readonly selectedCompliance = computed(() => this.service.assetComplianceRecords().filter((record) => record.assetId === this.selectedAssetEffectiveId()));
  readonly selectedLatestMeter = computed(() => this.latestMeterForTemplate(this.selectedAssetEffectiveId()));
  readonly activeEvidence = computed(() => {
    const draftId = this.activeDraft()?.id;
    return draftId ? this.registration.evidence().filter((item) => item.draftId === draftId) : [];
  });
  assetForm: VehicleAsset = this.newAsset('engineering');

  assetRegistrationValidation() {
    return validateAssetRegistration(this.assetForm, this.detailsVerified());
  }

  switchWorkspace(workspace: AssetWorkspace) {
    this.activeWorkspace.set(workspace);
    this.selectedAssetId.set('');
    this.searchTerm.set('');
    this.lifecycleFilter.set('all');
    this.readinessFilter.set('all');
    this.siteFilter.set('all');
    this.page.set(1);
    this.manageOpen.set(false);
  }

  openRegister() {
    this.assetForm = this.newAsset(this.activeWorkspace());
    this.activeDraft.set(this.registration.createDraft(this.assetForm));
    this.saveError.set('');
    this.registrationMessage.set('');
    this.detailsVerified.set(false);
    this.overlayMode.set('register');
  }

  openEditor(asset: VehicleAsset) {
    this.assetForm = { ...asset };
    this.activeDraft.set(null);
    this.selectedAssetId.set(asset.id);
    this.saveError.set('');
    this.detailsVerified.set(false);
    this.overlayMode.set('register');
  }

  selectAsset(asset: VehicleAsset) {
    this.selectedAssetId.set(asset.id);
    this.manageOpen.set(false);
  }

  async saveAsset() {
    this.saveError.set('');
    if (!this.assetRegistrationReady() || !this.detailsVerified()) {
      this.saveError.set('Complete every required field and verify the captured details before saving.');
      return;
    }
    this.registrationBusy.set(true);
    try {
      const draft = this.activeDraft();
      const savedDraft = draft ? await this.registration.saveDraft({ ...draft, asset: { ...this.assetForm } }) : null;
      const savedAsset = await this.service.saveAsset(this.assetForm);
      if (savedDraft) {
        await this.registration.completeDraft(savedDraft, savedAsset.id);
        const reminderResult = await this.registration.scheduleReminders(this.assetForm);
        this.registrationMessage.set(reminderResult.native
          ? `${reminderResult.scheduled} device reminders scheduled.`
          : 'Registration completed. Reminder dates are recorded; device scheduling activates in the installed mobile app.');
      }
      this.selectedAssetId.set(savedAsset.id);
      this.overlayMode.set(null);
      this.activeDraft.set(null);
      this.assetForm = this.newAsset(this.activeWorkspace());
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Unable to save asset.');
    } finally {
      this.registrationBusy.set(false);
    }
  }

  async saveRegistrationDraft() {
    this.saveError.set('');
    this.registrationBusy.set(true);
    try {
      const draft = this.activeDraft() || this.registration.createDraft(this.assetForm);
      const saved = await this.registration.saveDraft({ ...draft, asset: { ...this.assetForm } });
      this.activeDraft.set(saved);
      this.registrationMessage.set(`Draft saved to ${saved.ownerName}'s registration queue.`);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Unable to save registration draft.');
    } finally {
      this.registrationBusy.set(false);
    }
  }

  resumeDraft(draft: AssetRegistrationDraft) {
    this.activeDraft.set({ ...draft, asset: { ...draft.asset } });
    this.assetForm = { ...draft.asset };
    this.activeWorkspace.set(this.assetWorkspace(draft.asset));
    this.saveError.set('');
    this.detailsVerified.set(false);
    this.registrationMessage.set(`Resuming ${draft.ownerName}'s ${this.registrationStateLabel(draft.state).toLowerCase()} registration.`);
    this.overlayMode.set('register');
  }

  async captureEvidence(evidenceType: AssetEvidenceType) {
    this.saveError.set('');
    this.registrationBusy.set(true);
    try {
      const evidenceInput = await this.registration.captureEvidence(evidenceType);
      await this.attachEvidence(evidenceInput, evidenceType);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to capture image.';
      if (!/cancel/i.test(message)) this.saveError.set(message);
    } finally {
      this.registrationBusy.set(false);
    }
  }

  async uploadEvidence(selection: AssetEvidenceFileSelection) {
    this.saveError.set('');
    this.registrationBusy.set(true);
    try {
      const evidenceInput = await this.registration.prepareEvidenceFile(selection.file, 'upload');
      await this.attachEvidence(evidenceInput, selection.evidenceType);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Unable to attach evidence.');
    } finally {
      this.registrationBusy.set(false);
    }
  }


  async applyExtraction(evidence: AssetRegistrationEvidence) {
    this.registrationBusy.set(true);
    try {
      this.assetForm = await this.registration.applyExtraction(this.assetForm, evidence);
      this.detailsVerified.set(false);
      const draft = this.activeDraft();
      if (draft) this.activeDraft.set(await this.registration.saveDraft({ ...draft, asset: { ...this.assetForm } }));
      this.registrationMessage.set('Detected values applied. Review every populated field before completing registration.');
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Unable to apply detected values.');
    } finally {
      this.registrationBusy.set(false);
    }
  }

  async applyManualExtraction(raw: string) {
    const fields = this.registration.parseOcrText(raw);
    const detectedFields = Object.keys(fields);
    if (!detectedFields.length) {
      this.registrationMessage.set('No structured asset fields were detected. Keep the source document visible and complete the form manually.');
      return;
    }

    this.saveError.set('');
    this.registrationBusy.set(true);
    try {
      this.assetForm = this.registration.applyExtractedFields(this.assetForm, fields);
      this.detailsVerified.set(false);
      const draft = this.activeDraft();
      if (draft) this.activeDraft.set(await this.registration.saveDraft({ ...draft, asset: { ...this.assetForm } }));
      this.registrationMessage.set(`OCR review populated ${detectedFields.length} field${detectedFields.length === 1 ? '' : 's'}. Check each value against the source document before saving.`);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Unable to apply OCR review text.');
    } finally {
      this.registrationBusy.set(false);
    }
  }

  registrationStateLabel(state: AssetRegistrationDraft['state']) {
    return { draft: 'Draft', review_required: 'Review required', ready: 'Ready to register', completed: 'Completed' }[state];
  }

  private async attachEvidence(input: AssetEvidenceInput, evidenceType: AssetEvidenceType) {
    let draft = this.activeDraft() || this.registration.createDraft(this.assetForm);
    draft = await this.registration.saveDraft({ ...draft, asset: { ...this.assetForm } });
    this.activeDraft.set(draft);
    const evidence = await this.registration.addEvidence(draft, evidenceType, input);
    draft = await this.registration.saveDraft({ ...draft, asset: { ...this.assetForm } });
    this.activeDraft.set(draft);
    this.detailsVerified.set(false);
    if (evidence.extractionState === 'review_required') {
      this.registrationMessage.set('Data detected. Review and apply the extracted values below.');
    } else if (evidence.extractionState === 'pending') {
      this.registrationMessage.set('Image saved. No supported OCR or barcode text was detected; keep it visible for review and complete missing fields manually.');
    } else {
      this.registrationMessage.set('Evidence attached to this draft.');
    }
  }

  updateSearch(value: string) {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  updateLifecycleFilter(value: string) {
    this.lifecycleFilter.set(value);
    this.page.set(1);
  }

  updateReadinessFilter(value: string) {
    this.readinessFilter.set(value);
    this.page.set(1);
  }

  updateSiteFilter(value: string) {
    this.siteFilter.set(value);
    this.page.set(1);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.lifecycleFilter.set('all');
    this.readinessFilter.set('all');
    this.siteFilter.set('all');
    this.page.set(1);
  }

  async retireAsset(asset: VehicleAsset) {
    this.saveError.set('');
    try {
      await this.service.saveAsset({ ...asset, lifecycleState: 'retired', retiredAt: new Date().toISOString(), status: 'Maintenance' });
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Unable to retire asset.');
    }
  }

  async previewImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const preview = this.service.previewAssetCsv(await file.text());
    this.importPreview.set(preview);
    this.importMessage.set(preview.conflicts.length ? `${preview.conflicts.length} conflict(s) must be resolved.` : `${preview.validAssets.length} asset(s) ready to import.`);
  }

  async commitImport() {
    const preview = this.importPreview();
    if (!preview) return;
    try {
      await this.service.commitAssetImport(preview);
      this.importMessage.set(`${preview.validAssets.length} asset(s) imported.`);
      this.importPreview.set(null);
    } catch (error) {
      this.importMessage.set(error instanceof Error ? error.message : 'Import failed.');
    }
  }


  assetRegistrationReady() {
    return this.assetRegistrationValidation().isValid;
  }

  registrationBlocker() {
    return this.assetRegistrationValidation().blocker;
  }
  assetWorkspace(asset: VehicleAsset): AssetWorkspace {
    const generalEquipment = /(generator|compressor|pump|welder|tool|trailer|compactor|mower|forklift)/i.test(asset.assetClass || `${asset.make} ${asset.model}`);
    return asset.type === 'Light Vehicle' || generalEquipment ? 'fleet' : 'engineering';
  }

  assetReadiness(asset: VehicleAsset): ReadinessState {
    if (['retired', 'disposed'].includes(asset.lifecycleState || '') || asset.status === 'Expired') return 'blocked';
    const openOrders = this.service.assetWorkOrders().filter((order) => order.assetId === asset.id && !['completed', 'cancelled'].includes(order.status));
    if (openOrders.some((order) => order.priority === 'critical' || order.status === 'blocked')) return 'blocked';
    const compliance = this.service.assetComplianceRecords().filter((record) => record.assetId === asset.id);
    const licenceExpired = Boolean(asset.licenseExpiry && new Date(`${asset.licenseExpiry}T23:59:59`).getTime() < Date.now());
    if (asset.status === 'Maintenance' || openOrders.length || licenceExpired || compliance.some((record) => ['due', 'expired'].includes(record.status))) return 'attention';
    return 'ready';
  }

  readinessLabel(asset: VehicleAsset) {
    return { ready: 'Ready', attention: 'Needs attention', blocked: 'Out of service' }[this.assetReadiness(asset)];
  }

  assetIdentifier(asset: VehicleAsset) {
    return asset.registrationNumber || asset.vin || asset.serialNumber || 'Identifier missing';
  }

  assetIdentifierDetails(asset: VehicleAsset) {
    return [
      asset.registrationNumber ? `Plate ${asset.registrationNumber}` : '',
      asset.vin ? `VIN ${asset.vin}` : '',
      asset.serialNumber ? `Serial ${asset.serialNumber}` : '',
    ].filter(Boolean).join(' / ');
  }

  meterLabel(reading: AssetMeterReading | null) {
    if (!reading) return 'No reading';
    const unit = reading.meterType === 'engine_hours' ? 'h' : reading.meterType === 'odometer_km' ? 'km' : 'cycles';
    return `${reading.reading.toLocaleString()} ${unit}`;
  }

  complianceLabel(assetId: string) {
    const records = this.service.assetComplianceRecords().filter((record) => record.assetId === assetId);
    if (!records.length) return 'No records';
    if (records.some((record) => record.status === 'expired')) return 'Expired';
    if (records.some((record) => record.status === 'due')) return 'Due soon';
    return 'Compliant';
  }

  latestMeterForTemplate(assetId: string): AssetMeterReading | null {
    return this.service.assetMeterReadings()
      .filter((reading) => reading.assetId === assetId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0] || null;
  }

  private newAsset(workspace: AssetWorkspace): VehicleAsset {
    return {
      id: '',
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      registrationNumber: '',
      serialNumber: '',
      vin: '',
      make: '',
      model: '',
      type: workspace === 'engineering' ? 'Yellow Metal' : 'Light Vehicle',
      assetClass: workspace === 'engineering' ? 'Excavator' : 'Light vehicle',
      licenseExpiry: new Date().toISOString().slice(0, 10),
      status: 'Active',
      lifecycleState: 'active',
      assignedSiteId: undefined,
      notes: '',
    };
  }
}
