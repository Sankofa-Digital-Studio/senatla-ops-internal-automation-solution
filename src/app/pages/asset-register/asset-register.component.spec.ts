import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { AuthService } from '../../core/services/auth.service';
import { AssetRegisterComponent } from './asset-register.component';

describe('AssetRegisterComponent', () => {
  let component: AssetRegisterComponent;
  let fixture: ComponentFixture<AssetRegisterComponent>;

  beforeEach(waitForAsync(async () => {
    resetTestStorage();
    await TestBed.configureTestingModule({
      imports: [AssetRegisterComponent],
      providers: TEST_APP_PROVIDERS,
    }).compileComponents();

    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    fixture = TestBed.createComponent(AssetRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the seeded demo assets and supports serial-only identity', async () => {
    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.service.assets().some((asset) => asset.serialNumber === 'CAT-320-EX-0042')).toBeTrue();
    const serialOnly = component.service.assets().find((asset) => asset.id === 'demo-excavator');
    expect(serialOnly?.vin).toBeUndefined();
    expect(component.assetIdentifier(serialOnly!)).toBe('CAT-320-EX-0042');
  });

  it('separates engineering assets from fleet and general equipment without changing ownership', () => {
    const excavator = component.service.assets().find((asset) => asset.id === 'demo-excavator')!;
    const bakkie = component.service.assets().find((asset) => asset.id === 'demo-bakkie')!;
    const generator = component.service.assets().find((asset) => asset.id === 'demo-generator')!;

    expect(component.assetWorkspace(excavator)).toBe('engineering');
    expect(component.assetWorkspace(bakkie)).toBe('fleet');
    expect(component.assetWorkspace(generator)).toBe('fleet');
    expect(generator.organizationId).toBe(excavator.organizationId);
  });

  it('derives explainable readiness from operational records', () => {
    const excavator = component.service.assets().find((asset) => asset.id === 'demo-excavator')!;
    const compressor = component.service.assets().find((asset) => asset.id === 'demo-compressor')!;
    const loader = component.service.assets().find((asset) => asset.id === 'demo-loader')!;

    expect(component.assetReadiness(excavator)).toBe('attention');
    expect(component.assetReadiness(compressor)).toBe('blocked');
    expect(component.assetReadiness(loader)).toBe('ready');
  });

  it('creates and persists an incomplete registration owned by the signed-in user', async () => {
    component.openRegister();
    component.assetForm.make = 'Toyota';
    component.assetForm.model = '';

    await component.saveRegistrationDraft();

    const draft = component.activeDraft();
    expect(draft).toBeTruthy();
    expect(draft?.ownerName).toBe('Office Admin');
    expect(draft?.state).toBe('draft');
    expect(component.registration.activeDrafts().some((entry) => entry.id === draft?.id)).toBeTrue();
  });

  it('blocks final asset save until required details are complete and verified', async () => {
    component.openRegister();
    component.assetForm = {
      ...component.assetForm,
      serialNumber: 'OCR-serial-001',
      make: 'CAT',
      model: '320',
      assetClass: 'Excavator',
      custodianName: 'Site Team A',
      assignedSiteId: component.service.activeSites()[0]?.id,
    };

    await component.saveAsset();

    expect(component.saveError()).toContain('verify');
    expect(component.service.assets().some((asset) => asset.serialNumber === 'OCR-SERIAL-001')).toBeFalse();

    component.detailsVerified.set(true);
    await component.saveAsset();

    const registered = component.service.assets().find((asset) => asset.serialNumber === 'OCR-SERIAL-001');
    expect(registered).toBeTruthy();
    const completedDraft = component.registration.drafts().find((draft) => draft.completedAssetId === registered?.id);
    expect(completedDraft?.state).toBe('completed');
  });
  it('records validation messages and inspect logs when a registration draft is saved', async () => {
    component.openRegister();
    component.assetForm.make = 'CAT';
    component.assetForm.model = '';

    await component.saveRegistrationDraft();

    const draft = component.activeDraft();
    expect(draft?.validationErrors).toContain('One identifier: number plate, VIN or serial number is required.');
    expect(draft?.validationErrors).toContain('Model is required.');
    expect(component.assetRegistrationValidation().messages).toContain('One identifier: number plate, VIN or serial number is required.');
    expect(component.registration.events().some((event) => event.action === 'asset_registration_draft_saved')).toBeTrue();
  });
  it('validates every upload type and size before evidence persistence', async () => {
    const unsupported = new File(['payload'], 'evidence.txt', { type: 'text/plain' });
    await expectAsync(component.registration.prepareEvidenceFile(unsupported, 'upload'))
      .toBeRejectedWithError(/Unsupported evidence type/);

    const oversized = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    await expectAsync(component.registration.prepareEvidenceFile(oversized, 'upload'))
      .toBeRejectedWithError(/15 MiB or smaller/);
  });

  it('keeps native OCR provenance and requires human review before applying values', async () => {
    component.openRegister();
    const draft = component.activeDraft()!;
    const prepared = await component.registration.prepareEvidenceFile(
      new File(['jpeg evidence'], 'licence.jpg', { type: 'image/jpeg' }),
      'native_scan',
    );

    const evidence = await component.registration.addEvidence(draft, 'licence_disc', {
      ...prepared,
      ocrEngine: 'android_mlkit_v2',
      ocrConfidence: 0.94,
      ocrPageCount: 1,
      rawOcrText: 'Registration: ABC 123 GP\nExpiry: 2030-06-30',
    });

    expect(evidence.captureSource).toBe('native_scan');
    expect(evidence.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.ocrEngine).toBe('android_mlkit_v2');
    expect(evidence.ocrConfidence).toBe(0.94);
    expect(evidence.extractionState).toBe('review_required');
    expect(evidence.extractedFields.registrationNumber).toBe('ABC 123 GP');
    expect(component.assetForm.registrationNumber).toBe('');
  });
  it('creates a pending evidence row before upload and checks rollback on upload failure', async () => {
    component.openRegister();
    const draft = component.activeDraft()!;
    const prepared = await component.registration.prepareEvidenceFile(
      new File(['jpeg evidence'], 'failed-upload.jpg', { type: 'image/jpeg' }),
      'upload',
    );
    const insert = jasmine.createSpy('insert').and.resolveTo({ error: null });
    const upload = jasmine.createSpy('upload').and.resolveTo({ error: { message: 'forced upload failure' } });
    const remove = jasmine.createSpy('remove').and.resolveTo({ error: null });
    const deleteQuery = { error: null, eq: jasmine.createSpy('deleteEq') };
    deleteQuery.eq.and.returnValue(deleteQuery);
    const fakeSupabase = {
      from: jasmine.createSpy('from').and.callFake((table: string) => {
        if (table !== 'asset_registration_evidence') throw new Error(`Unexpected table ${table}`);
        return { insert, delete: () => deleteQuery };
      }),
      storage: { from: () => ({ upload, remove }) },
    };
    (component.registration as unknown as { supabase: typeof fakeSupabase }).supabase = fakeSupabase;

    await expectAsync(component.registration.addEvidence(draft, 'registration_document', prepared))
      .toBeRejectedWithError(/No evidence was retained/);

    expect(insert).toHaveBeenCalledBefore(upload);
    expect(insert.calls.mostRecent().args[0].storage_state).toBe('pending_upload');
    expect(remove).toHaveBeenCalledOnceWith([jasmine.stringMatching(/failed-upload\.jpg$/)]);
    expect(deleteQuery.eq).toHaveBeenCalledWith('storage_state', 'pending_upload');
  });
  it('builds renewal and 30-day grace reminder milestones at 7, 5, 3 and 1 days', () => {
    const asset = {
      ...component.service.assets().find((entry) => entry.id === 'demo-bakkie')!,
      licenseExpiry: '2030-06-30',
    };

    const milestones = component.registration.reminderMilestones(asset);

    expect(milestones.length).toBe(10);
    expect(milestones[0].scheduledAt.getDate()).toBe(23);
    expect(milestones.filter((item) => item.phase === 'expiry').length).toBe(4);
    expect(milestones.filter((item) => item.phase === 'grace').length).toBe(6);
    expect(milestones[milestones.length - 1].scheduledAt.getTime() - new Date(2030, 5, 30, 9).getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
