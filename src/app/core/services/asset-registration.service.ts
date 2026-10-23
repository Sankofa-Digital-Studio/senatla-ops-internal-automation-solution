import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config/runtime-config';
import {
  AssetEvidenceInput,
  AssetEvidenceType,
  AssetOcrEngine,
  AssetRegistrationDraft,
  AssetRegistrationEvent,
  AssetRegistrationEvidence,
  AssetReminderMilestone,
  SENATLA_TRADING_ORGANIZATION_ID,
  VehicleAsset,
} from '../models/app.models';
import { injectSupabaseClient } from '../gateways/supabase.client';
import { AuthService } from './auth.service';
import { validateAssetRegistration } from '../validation/asset-registration-rules';
import { ScanCoordinator } from '../scanning/scan-coordinator';
import { ScanError } from '../scanning/scan-contract';

const LOCAL_DRAFTS_KEY = 'senatla.asset-registration.v1';
const LOCAL_EVENTS_KEY = 'senatla.asset-registration.events.v1';
const PRE_EXPIRY_DAYS = [7, 5, 3, 1] as const;
const GRACE_DAYS = 30;
const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);

interface NativeLocalNotifications {
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: { notifications: Array<{ id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle: boolean }; extra: Record<string, string> }> }): Promise<void>;
  cancel(options: { notifications: Array<{ id: number }> }): Promise<void>;
}

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BrowserBarcodeDetector {
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

interface TextDetectorResult {
  rawValue?: string;
  text?: string;
}

interface BrowserTextDetector {
  detect(source: ImageBitmapSource): Promise<TextDetectorResult[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BrowserBarcodeDetector;
type TextDetectorConstructor = new () => BrowserTextDetector;

const LocalNotifications = registerPlugin<NativeLocalNotifications>('LocalNotifications');
const EXTRACTABLE_EVIDENCE_TYPES: readonly AssetEvidenceType[] = [
  'number_plate',
  'licence_disc',
  'registration_document',
  'purchase_invoice',
];

@Injectable({ providedIn: 'root' })
export class AssetRegistrationService {
  private readonly auth = inject(AuthService);
  private readonly config = inject<RuntimeConfig>(RUNTIME_CONFIG);
  private readonly supabase = this.config.api.mode === 'supabase' ? injectSupabaseClient() : null;
  private readonly draftsState = signal<AssetRegistrationDraft[]>([]);
  private readonly evidenceState = signal<AssetRegistrationEvidence[]>([]);
  private readonly eventState = signal<AssetRegistrationEvent[]>([]);
  private readonly scanCoordinator = new ScanCoordinator();

  readonly drafts = this.draftsState.asReadonly();
  readonly evidence = this.evidenceState.asReadonly();
  readonly events = this.eventState.asReadonly();
  readonly activeDrafts = computed(() => this.draftsState().filter((draft) => draft.state !== 'completed'));

  constructor() {
    effect(() => {
      const session = this.auth.session();
      if (!this.auth.isReady() || !session) return;
      void this.load(session.userId);
    });
  }

  createDraft(asset: VehicleAsset): AssetRegistrationDraft {
    const session = this.requireSession();
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      ownerId: session.userId,
      ownerName: session.displayName,
      state: 'draft',
      asset: { ...asset, id: asset.id || crypto.randomUUID() },
      createdAt: now,
      updatedAt: now,
      completedAssetId: null,
    };
  }

  async saveDraft(draft: AssetRegistrationDraft) {
    const session = this.requireSession();
    if (draft.ownerId !== session.userId && session.role !== 'office') {
      throw new Error('Only the registration owner or an office administrator can update this draft.');
    }
    const validation = validateAssetRegistration(draft.asset, Boolean(draft.verifiedAt));
    const next: AssetRegistrationDraft = {
      ...draft,
      state: this.registrationState({ ...draft, validationErrors: validation.messages }),
      validationErrors: validation.messages,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (this.supabase) {
        const payload = {
          id: next.id,
          organization_id: next.organizationId,
          owner_id: next.ownerId,
          owner_name: next.ownerName,
          state: next.state,
          asset_data: next.asset,
          validation_errors: next.validationErrors ?? [],
          verified_at: next.verifiedAt ?? null,
          verified_by: next.verifiedBy ?? null,
          completed_asset_id: next.completedAssetId ?? null,
          created_at: next.createdAt,
          updated_at: next.updatedAt,
        };
        const exists = this.draftsState().some((entry) => entry.id === next.id);
        const { error } = exists
          ? await this.supabase.from('asset_registration_drafts').update(payload).eq('id', next.id)
          : await this.supabase.from('asset_registration_drafts').insert(payload);
        if (error) throw error;
      }

      this.draftsState.update((drafts) => [next, ...drafts.filter((entry) => entry.id !== next.id)]);
      this.persistLocal();
      await this.recordEvent('asset_registration_draft_saved', next.id, {
        state: next.state,
        missingFields: validation.missingFields,
        identifierProvided: validation.identifierProvided,
      });
      return next;
    } catch (error) {
      await this.recordEvent('asset_registration_draft_save_failed', draft.id, {
        message: this.errorMessage(error),
        missingFields: validation.missingFields,
      });
      throw error;
    }
  }
  async completeDraft(draft: AssetRegistrationDraft, completedAssetId: string) {
    const session = this.requireSession();
    const verifiedAt = draft.verifiedAt ?? new Date().toISOString();
    const next = await this.saveDraft({ ...draft, state: 'completed', completedAssetId, verifiedAt, verifiedBy: draft.verifiedBy ?? session.userId });
    this.draftsState.update((drafts) => drafts.map((entry) => entry.id === next.id ? { ...next, state: 'completed' } : entry));
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_registration_drafts').update({
        state: 'completed',
        completed_asset_id: completedAssetId,
        verified_at: verifiedAt,
        verified_by: next.verifiedBy,
        updated_at: new Date().toISOString(),
      }).eq('id', next.id);
      if (error) throw error;
    }
    await this.recordEvent('asset_registration_completed', next.id, { completedAssetId, verifiedAt });
    this.persistLocal();
  }
  async captureEvidence(evidenceType: AssetEvidenceType): Promise<AssetEvidenceInput> {
    if (EXTRACTABLE_EVIDENCE_TYPES.includes(evidenceType) && Capacitor.isNativePlatform()) {
      try {
        const scan = await this.scanCoordinator.scanAssetEvidence({
          galleryImportAllowed: false,
          recognitionLanguages: ['en-ZA'],
        });
        return this.validateEvidenceInput({
          file: scan.file,
          captureSource: 'native_scan',
          contentSha256: scan.sha256,
          ocrEngine: Capacitor.getPlatform() === 'android' ? 'android_mlkit_v2' : 'ios_vision',
          ocrConfidence: this.averageConfidence(scan.ocr.textBlocks.map((block) => block.confidence)),
          ocrPageCount: 1,
          rawOcrText: scan.ocr.text,
        });
      } catch (error) {
        if (error instanceof ScanError
          && !['UNSUPPORTED_PLATFORM', 'NATIVE_FAILURE'].includes(error.code)) {
          throw error;
        }
      }
    }
    return this.captureWithCamera(evidenceType);
  }

  async captureImage(evidenceType: AssetEvidenceType): Promise<File> {
    return (await this.captureWithCamera(evidenceType)).file;
  }

  async prepareEvidenceFile(file: File, captureSource: AssetEvidenceInput['captureSource'] = 'upload'): Promise<AssetEvidenceInput> {
    this.validateEvidenceFile(file);
    return {
      file,
      captureSource,
      contentSha256: await this.sha256(file),
      ocrEngine: null,
      ocrConfidence: null,
      ocrPageCount: 1,
    };
  }

  async addEvidence(
    draft: AssetRegistrationDraft,
    evidenceType: AssetEvidenceType,
    input: AssetEvidenceInput | File,
  ) {
    const session = this.requireSession();
    const prepared = input instanceof File ? await this.prepareEvidenceFile(input) : this.validateEvidenceInput(input);
    const { file } = prepared;
    const extractable = EXTRACTABLE_EVIDENCE_TYPES.includes(evidenceType);
    let raw = prepared.rawOcrText?.slice(0, 8_000) ?? '';
    let fields = raw ? this.parseOcrText(raw) : {};
    let ocrEngine: AssetOcrEngine | null = prepared.ocrEngine;
    if (extractable && !raw && file.type.startsWith('image/')) {
      const browserExtraction = await this.extractFromImage(file);
      raw = browserExtraction.raw.slice(0, 8_000);
      fields = browserExtraction.fields;
      if (browserExtraction.detectorUsed) ocrEngine = 'browser_detector';
    }
    const verifiedSha256 = await this.sha256(file);
    if (verifiedSha256 !== prepared.contentSha256) {
      throw new Error('Evidence bytes changed after capture validation. Capture or select the document again.');
    }
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
    const storagePath = `${draft.organizationId}/${draft.ownerId}/${draft.id}/${id}-${safeName}`;
    const evidence: AssetRegistrationEvidence = {
      id,
      organizationId: draft.organizationId,
      draftId: draft.id,
      uploadedBy: session.userId,
      evidenceType,
      fileName: file.name,
      mimeType: file.type,
      captureSource: prepared.captureSource,
      contentSha256: verifiedSha256,
      ocrEngine,
      ocrConfidence: prepared.ocrConfidence,
      ocrPageCount: prepared.ocrPageCount,
      storageState: this.supabase ? 'pending_upload' : 'ready',
      storagePath: this.supabase ? storagePath : null,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      extractionState: extractable ? (Object.keys(fields).length ? 'review_required' : 'pending') : 'not_applicable',
      extractedFields: fields,
      rawExtraction: raw || null,
      createdAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error: insertError } = await this.supabase.from('asset_registration_evidence').insert({
        id: evidence.id,
        organization_id: evidence.organizationId,
        draft_id: evidence.draftId,
        uploaded_by: evidence.uploadedBy,
        evidence_type: evidence.evidenceType,
        file_name: evidence.fileName,
        mime_type: evidence.mimeType,
        capture_source: evidence.captureSource,
        content_sha256: evidence.contentSha256,
        ocr_engine: evidence.ocrEngine,
        ocr_confidence: evidence.ocrConfidence,
        ocr_page_count: evidence.ocrPageCount,
        storage_state: evidence.storageState,
        storage_path: evidence.storagePath,
        extraction_state: evidence.extractionState,
        extracted_fields: evidence.extractedFields,
        raw_extraction: evidence.rawExtraction,
        created_at: evidence.createdAt,
      });
      if (insertError) throw insertError;

      const upload = await this.supabase.storage.from('asset-evidence').upload(storagePath, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upload.error) {
        const rolledBack = await this.rollbackPendingEvidence(evidence.id, storagePath);
        throw new Error(rolledBack
          ? 'Evidence upload failed. No evidence was retained.'
          : 'Evidence upload failed and secure rollback requires administrator review.');
      }

      const { error: readyError } = await this.supabase.from('asset_registration_evidence')
        .update({ storage_state: 'ready' })
        .eq('id', evidence.id)
        .eq('storage_state', 'pending_upload');
      if (readyError) {
        const rolledBack = await this.rollbackPendingEvidence(evidence.id, storagePath);
        throw new Error(rolledBack
          ? 'Evidence finalisation failed. No evidence was retained.'
          : 'Evidence finalisation failed and secure rollback requires administrator review.');
      }
      evidence.storageState = 'ready';
    }
    this.evidenceState.update((items) => [evidence, ...items]);
    this.persistLocal();
    await this.recordEvent('asset_registration_evidence_attached', draft.id, {
      evidenceId: evidence.id,
      evidenceType: evidence.evidenceType,
      captureSource: evidence.captureSource,
      ocrEngine: evidence.ocrEngine,
      ocrPageCount: evidence.ocrPageCount,
      extractionState: evidence.extractionState,
      detectedFields: Object.keys(evidence.extractedFields),
    });
    return evidence;
  }
  async applyExtraction(asset: VehicleAsset, evidence: AssetRegistrationEvidence): Promise<VehicleAsset> {
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_registration_evidence')
        .update({ extraction_state: 'applied' })
        .eq('id', evidence.id);
      if (error) throw error;
    }
    this.evidenceState.update((items) => items.map((item) => item.id === evidence.id ? { ...item, extractionState: 'applied' } : item));
    this.persistLocal();
    await this.recordEvent('asset_registration_extraction_applied', evidence.draftId, {
      evidenceId: evidence.id,
      detectedFields: Object.keys(evidence.extractedFields),
    });
    return this.applyExtractedFields(asset, evidence.extractedFields);
  }

  parseOcrText(raw: string): AssetRegistrationEvidence['extractedFields'] {
    return this.parseRegistrationText(raw.slice(0, 8_000));
  }

  applyExtractedFields(asset: VehicleAsset, fields: AssetRegistrationEvidence['extractedFields']): VehicleAsset {
    return { ...asset, ...fields };
  }

  evidenceFor(draftId: string) {
    return this.evidenceState().filter((item) => item.draftId === draftId);
  }

  reminderMilestones(asset: VehicleAsset): AssetReminderMilestone[] {
    if (!asset.licenseExpiry) return [];
    const expiry = this.atLocalTime(asset.licenseExpiry, 9);
    const identifier = asset.registrationNumber || asset.vin || asset.serialNumber || `${asset.make} ${asset.model}`.trim() || 'Asset';
    const graceEnd = new Date(expiry);
    graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);
    const milestones: AssetReminderMilestone[] = [];
    PRE_EXPIRY_DAYS.forEach((days, index) => {
      milestones.push({
        id: this.notificationId(asset.id, index),
        title: `Licence expires in ${days} day${days === 1 ? '' : 's'}`,
        body: `${identifier} must be renewed by ${asset.licenseExpiry}.`,
        scheduledAt: this.daysBefore(expiry, days),
        phase: 'expiry',
      });
      milestones.push({
        id: this.notificationId(asset.id, index + PRE_EXPIRY_DAYS.length),
        title: `Grace period ends in ${days} day${days === 1 ? '' : 's'}`,
        body: `${identifier} is in its 30-day grace period. Complete renewal before enforcement.`,
        scheduledAt: this.daysBefore(graceEnd, days),
        phase: 'grace',
      });
    });
    milestones.push({
      id: this.notificationId(asset.id, 8),
      title: 'Vehicle licence grace period started',
      body: `${identifier} has expired. The 30-day grace period is now active.`,
      scheduledAt: expiry,
      phase: 'grace',
    });
    milestones.push({
      id: this.notificationId(asset.id, 9),
      title: 'Vehicle licence grace period ended',
      body: `${identifier} is outside the 30-day grace period and requires immediate action.`,
      scheduledAt: graceEnd,
      phase: 'grace',
    });
    return milestones.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async scheduleReminders(asset: VehicleAsset) {
    const future = this.reminderMilestones(asset).filter((item) => item.scheduledAt.getTime() > Date.now());
    if (!future.length || !Capacitor.isNativePlatform()) return { scheduled: 0, native: false };
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') throw new Error('Notification permission was not granted.');
    await LocalNotifications.cancel({ notifications: this.reminderMilestones(asset).map((item) => ({ id: item.id })) });
    await LocalNotifications.schedule({
      notifications: future.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        schedule: { at: item.scheduledAt, allowWhileIdle: true },
        extra: { assetId: asset.id, phase: item.phase },
      })),
    });
    return { scheduled: future.length, native: true };
  }

  private async load(userId: string) {
    if (!this.supabase) {
      const raw = localStorage.getItem(LOCAL_DRAFTS_KEY + '.' + userId);
      if (!raw) return;
      const data = JSON.parse(raw) as { drafts: AssetRegistrationDraft[]; evidence: AssetRegistrationEvidence[]; events?: AssetRegistrationEvent[] };
      this.draftsState.set(data.drafts || []);
      this.evidenceState.set((data.evidence || []).map((item) => ({
        ...item,
        captureSource: item.captureSource ?? 'upload',
        contentSha256: item.contentSha256 ?? null,
        ocrEngine: item.ocrEngine ?? null,
        ocrConfidence: item.ocrConfidence ?? null,
        ocrPageCount: item.ocrPageCount ?? 1,
        storageState: item.storageState ?? 'ready',
      })));
      this.eventState.set(data.events || []);
      return;
    }
    const [drafts, evidence, events] = await Promise.all([
      this.supabase.from('asset_registration_drafts').select('*').order('updated_at', { ascending: false }),
      this.supabase.from('asset_registration_evidence').select('*').eq('storage_state', 'ready').order('created_at', { ascending: false }),
      this.supabase.from('admin_activity_log').select('id, organization_id, action, entity_id, actor_id, actor_name, details, occurred_at').eq('entity_type', 'asset_registration').order('occurred_at', { ascending: false }).limit(50),
    ]);
    if (drafts.error) throw drafts.error;
    if (evidence.error) throw evidence.error;
    if (events.error) throw events.error;
    this.draftsState.set((drafts.data || []).map((row) => ({
      id: row.id, organizationId: row.organization_id, ownerId: row.owner_id, ownerName: row.owner_name,
      state: row.state, asset: row.asset_data, createdAt: row.created_at, updatedAt: row.updated_at,
      completedAssetId: row.completed_asset_id,
      validationErrors: row.validation_errors || [], verifiedAt: row.verified_at, verifiedBy: row.verified_by,
    })));
    this.eventState.set((events.data || []).map((row) => ({
      id: row.id, organizationId: row.organization_id, action: row.action, entityId: row.entity_id || '',
      actorId: row.actor_id, actorName: row.actor_name, details: row.details, occurredAt: row.occurred_at,
    })));
    this.evidenceState.set((evidence.data || []).map((row) => ({
      id: row.id, organizationId: row.organization_id, draftId: row.draft_id, uploadedBy: row.uploaded_by,
      evidenceType: row.evidence_type, fileName: row.file_name, mimeType: row.mime_type, storagePath: row.storage_path,
      captureSource: row.capture_source || 'upload', contentSha256: row.content_sha256 || null,
      ocrEngine: row.ocr_engine || null, ocrConfidence: row.ocr_confidence ?? null, ocrPageCount: row.ocr_page_count || 1,
      storageState: row.storage_state || 'ready',
      previewUrl: null, extractionState: row.extraction_state, extractedFields: row.extracted_fields || {},
      rawExtraction: row.raw_extraction, createdAt: row.created_at,
    })));
  }

  private registrationState(draft: AssetRegistrationDraft): AssetRegistrationDraft['state'] {
    if (draft.state === 'completed') return 'completed';
    const validation = validateAssetRegistration(draft.asset, Boolean(draft.verifiedAt));
    const evidence = this.evidenceFor(draft.id);
    if (!validation.isValid) return 'draft';
    if (evidence.some((item) => item.extractionState === 'pending' || item.extractionState === 'review_required')) return 'review_required';
    return 'ready';
  }

  private async captureWithCamera(evidenceType: AssetEvidenceType): Promise<AssetEvidenceInput> {
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      direction: CameraDirection.Rear,
      resultType: CameraResultType.Uri,
      quality: evidenceType === 'asset_photo' ? 78 : 92,
      correctOrientation: true,
      width: 1800,
    });
    if (!photo.webPath) throw new Error('The camera did not return an image.');
    const response = await fetch(photo.webPath, { cache: 'no-store' });
    if (!response.ok) throw new Error('The captured image could not be read securely.');
    const blob = await response.blob();
    const mimeType = blob.type || `image/${photo.format || 'jpeg'}`;
    const file = new File([blob], `${evidenceType}-${Date.now()}.${photo.format || 'jpeg'}`, { type: mimeType });
    return this.prepareEvidenceFile(file, Capacitor.isNativePlatform() ? 'native_camera' : 'upload');
  }

  private validateEvidenceInput(input: AssetEvidenceInput): AssetEvidenceInput {
    this.validateEvidenceFile(input.file);
    if (!/^[a-f0-9]{64}$/.test(input.contentSha256)
      || !['native_scan', 'native_camera', 'upload', 'manual'].includes(input.captureSource)
      || (input.ocrEngine !== null && !['android_mlkit_v2', 'ios_vision', 'browser_detector', 'manual'].includes(input.ocrEngine))
      || (input.ocrConfidence !== null && (!Number.isFinite(input.ocrConfidence) || input.ocrConfidence < 0 || input.ocrConfidence > 1))
      || !Number.isInteger(input.ocrPageCount)
      || input.ocrPageCount < 1
      || input.ocrPageCount > 5) {
      throw new Error('The evidence provenance is invalid. Capture or select the document again.');
    }
    return { ...input, rawOcrText: input.rawOcrText?.slice(0, 8_000) };
  }

  private validateEvidenceFile(file: File): void {
    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_EVIDENCE_MIME_TYPES.has(mimeType)) {
      throw new Error('Unsupported evidence type. Use PDF, JPEG, PNG, WebP, HEIC, or HEIF.');
    }
    if (file.size <= 0) throw new Error('The selected evidence file is empty.');
    if (file.size > MAX_EVIDENCE_BYTES) throw new Error('Evidence files must be 15 MiB or smaller.');
  }

  private async sha256(file: Blob): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private averageConfidence(values: Array<number | undefined>): number | null {
    const measured = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (!measured.length) return null;
    return measured.reduce((sum, value) => sum + value, 0) / measured.length;
  }
  private async extractFromImage(file: File) {
    const detectorUsed = Boolean(
      (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
      || (globalThis as typeof globalThis & { TextDetector?: TextDetectorConstructor }).TextDetector,
    );
    try {
      const bitmap = await createImageBitmap(file);
      const raw = [
        await this.extractBarcodeText(bitmap),
        await this.extractOcrText(bitmap),
      ].filter(Boolean).join('\n');
      bitmap.close();
      return { raw, fields: this.parseOcrText(raw), detectorUsed };
    } catch {
      return { raw: '', fields: {}, detectorUsed };
    }
  }
  private async extractBarcodeText(bitmap: ImageBitmap) {
    const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) return '';
    try {
      const results = await new Detector().detect(bitmap);
      return results.map((result) => result.rawValue).filter(Boolean).join('\n');
    } catch {
      return '';
    }
  }

  private async extractOcrText(bitmap: ImageBitmap) {
    const Detector = (globalThis as typeof globalThis & { TextDetector?: TextDetectorConstructor }).TextDetector;
    if (!Detector) return '';
    try {
      const results = await new Detector().detect(bitmap);
      return results.map((result) => result.rawValue || result.text || '').filter(Boolean).join('\n');
    } catch {
      return '';
    }
  }

  private parseRegistrationText(raw: string): AssetRegistrationEvidence['extractedFields'] {
    if (!raw.trim()) return {};
    const fields: AssetRegistrationEvidence['extractedFields'] = {};
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      fields.registrationNumber = this.stringValue(data, ['registrationNumber', 'registration', 'plate', 'numberPlate']);
      fields.vin = this.stringValue(data, ['vin', 'chassisNumber']);
      fields.serialNumber = this.stringValue(data, ['serialNumber', 'serial', 'assetIdentifier', 'assetId', 'assetNumber']);
      fields.make = this.stringValue(data, ['make', 'manufacturer']);
      fields.model = this.stringValue(data, ['model']);
      fields.licenseExpiry = this.normalizeDate(this.stringValue(data, ['licenseExpiry', 'licenceExpiry', 'expiryDate']));
    } catch {
      const value = (label: string) => raw.match(new RegExp(`${label}\\s*[:=-]\\s*([^\\n;|]+)`, 'i'))?.[1]?.trim();
      fields.registrationNumber = value('(?:registration|reg|plate|number plate|numberplate)');
      fields.vin = value('(?:vin|chassis)') || raw.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0];
      fields.serialNumber = value('(?:serial|asset identifier|asset id|asset number)') || this.inferSerialNumber(raw, fields.registrationNumber, fields.vin);
      fields.make = value('make');
      fields.model = value('model');
      fields.licenseExpiry = this.normalizeDate(value('(?:expiry|expires|licence expiry|license expiry)'));
    }
    return Object.entries(fields).reduce<AssetRegistrationEvidence['extractedFields']>((result, [key, value]) => {
      if (value) result[key as keyof AssetRegistrationEvidence['extractedFields']] = value;
      return result;
    }, {});
  }

  private inferSerialNumber(raw: string, registrationNumber?: string, vin?: string) {
    const candidates = raw.match(/\b[A-Z0-9][A-Z0-9-]{5,24}\b/gi) || [];
    return candidates
      .map((candidate) => candidate.trim().toUpperCase())
      .find((candidate) => candidate !== registrationNumber?.toUpperCase() && candidate !== vin?.toUpperCase() && !/^20\d{2}/.test(candidate));
  }

  private stringValue(data: Record<string, unknown>, keys: string[]) {
    const key = keys.find((candidate) => typeof data[candidate] === 'string');
    return key ? String(data[key]).trim() : undefined;
  }

  private normalizeDate(value?: string) {
    if (!value) return undefined;
    const iso = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    const local = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
    return local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : undefined;
  }

  private async rollbackPendingEvidence(evidenceId: string, storagePath: string): Promise<boolean> {
    if (!this.supabase) return true;
    const storageRemoval = await this.supabase.storage.from('asset-evidence').remove([storagePath]);
    const rowRemoval = await this.supabase.from('asset_registration_evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('storage_state', 'pending_upload');
    return !storageRemoval.error && !rowRemoval.error;
  }
  private persistLocal() {
    if (this.supabase) return;
    const userId = this.auth.session()?.userId;
    if (!userId) return;
    localStorage.setItem(LOCAL_DRAFTS_KEY + '.' + userId, JSON.stringify({ drafts: this.draftsState(), evidence: this.evidenceState(), events: this.eventState() }));
    this.persistLocalEvents(userId);
  }

  private persistLocalEvents(userId = this.auth.session()?.userId) {
    if (!userId) return;
    localStorage.setItem(LOCAL_EVENTS_KEY + '.' + userId, JSON.stringify(this.eventState()));
  }

  private async recordEvent(action: string, entityId: string, details?: Record<string, unknown>) {
    const session = this.auth.session();
    if (!session) return;
    const event: AssetRegistrationEvent = {
      id: crypto.randomUUID(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      action,
      entityId,
      actorId: session.userId,
      actorName: session.displayName,
      details: details ?? null,
      occurredAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('admin_activity_log').insert({
        id: event.id,
        organization_id: event.organizationId,
        actor_id: event.actorId,
        actor_name: event.actorName,
        action: event.action,
        entity_type: 'asset_registration',
        entity_id: event.entityId,
        details: event.details,
      });
      if (error) console.warn('Asset registration event log failed', error.message);
    }

    this.eventState.update((events) => [event, ...events].slice(0, 50));
    this.persistLocalEvents(session.userId);
    this.persistLocal();
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown asset registration error.';
  }
  private requireSession() {
    const session = this.auth.currentSession();
    if (!session) throw new Error('Sign in before registering an asset.');
    return session;
  }

  private toDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private atLocalTime(date: string, hour: number) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, hour, 0, 0, 0);
  }

  private daysBefore(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  private notificationId(assetId: string, offset: number) {
    let hash = 0;
    for (const character of assetId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return Math.abs((hash % 10000000) * 10 + offset) || offset + 1;
  }
}
