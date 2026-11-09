import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AssetEvidenceType,
  AssetRegistrationDraft,
  AssetRegistrationEvidence,
  AssetReminderMilestone,
  Site,
  VehicleAsset,
} from '../core/models/app.models';
import { AssetFormComponent } from './asset-form.component';
import { UiButtonComponent } from './ui-button.component';
import { UiFeedbackComponent } from './ui-feedback.component';
import { evaluateOcrQuality } from '../core/scanning/ocr-quality-evaluator';

export interface AssetEvidenceFileSelection {
  file: File;
  evidenceType: AssetEvidenceType;
}

export type AssetVerificationMode = 'combo' | 'ocr' | 'manual';

@Component({
  selector: 'app-asset-registration-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, AssetFormComponent, UiButtonComponent, UiFeedbackComponent],
  template: `
    <div class="workflow" [class.combo-layout]="activeMode() === 'combo'" [class.ocr-layout]="activeMode() === 'ocr'" [class.manual-layout]="activeMode() === 'manual'">
      <!-- Input & Verification Mode Selector -->
      <section class="mode-selector-strip full-row" aria-label="Input and verification mode selector">
        <div class="mode-selector-tabs" role="tablist" aria-label="Input and verification options">
          <button
            type="button"
            class="mode-pill"
            [class.active]="activeMode() === 'combo'"
            (click)="setMode('combo')"
            role="tab"
            [attr.aria-selected]="activeMode() === 'combo'"
            title="Scan or upload documents side-by-side with live editable form"
          >
            <span class="mode-glyph">⚡</span>
            <span class="mode-label">
              <strong>Combo Mode</strong>
              <small>OCR Scan + Live Form Side-by-Side</small>
            </span>
            <span class="rec-tag">Recommended</span>
          </button>

          <button
            type="button"
            class="mode-pill"
            [class.active]="activeMode() === 'ocr'"
            (click)="setMode('ocr')"
            role="tab"
            [attr.aria-selected]="activeMode() === 'ocr'"
            title="Scan licence discs, registration papers or invoices to extract data"
          >
            <span class="mode-glyph">📷</span>
            <span class="mode-label">
              <strong>OCR / Scan Only</strong>
              <small>Document, disc &amp; serial plate extraction</small>
            </span>
          </button>

          <button
            type="button"
            class="mode-pill"
            [class.active]="activeMode() === 'manual'"
            (click)="setMode('manual')"
            role="tab"
            [attr.aria-selected]="activeMode() === 'manual'"
            title="Direct field entry from physical paperwork without scanning"
          >
            <span class="mode-glyph">✍️</span>
            <span class="mode-label">
              <strong>Manual Input</strong>
              <small>Direct field entry &amp; document cross-check</small>
            </span>
          </button>
        </div>
      </section>

      <!-- Registration draft status -->
      <section class="registration-status full-row" *ngIf="draft">
        <div><span></span><strong>{{ stateLabel(draft.state) }}</strong><small>Owned by {{ draft.ownerName }}</small></div>
        <app-ui-button size="sm" variant="secondary" [busy]="busy" (pressed)="draftSaveRequested.emit()">Save draft</app-ui-button>
      </section>

      <!-- Manual Mode Notice -->
      <section class="manual-mode-notice full-row" *ngIf="activeMode() === 'manual'">
        <div class="notice-body">
          <span class="notice-icon">✍️</span>
          <div>
            <strong>Manual Verification Mode</strong>
            <p>Direct entry mode active. Complete asset details (Year Model, Date Acquired, VIN, Custodian, Compliance Date) directly into the form. Switch to <em>Combo</em> or <em>OCR</em> mode if you need to upload source documents or scan plates.</p>
          </div>
        </div>
      </section>

      <!-- OCR and Evidence capture (visible in Combo and OCR modes) -->
      <div class="ocr-column" *ngIf="activeMode() !== 'manual'">
        <section class="capture-workspace">
          <header>
            <h3>Capture and scan</h3>
            <p>Scan a serial number, number plate or licence disc. Evidence is validated and attached to the registration draft; detected values still require human review.</p>
          </header>
          <div class="capture-grid">
            <button *ngFor="let option of captureOptions" type="button" [disabled]="busy" (click)="captureRequested.emit(option.type)">
              <span>{{ option.symbol }}</span><strong>{{ option.label }}</strong><small>{{ option.detail }}</small>
            </button>
          </div>
          <div class="document-grid">
            <label *ngFor="let option of documentOptions">
              <strong>{{ option.label }}</strong>
              <span>PDF or image</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" [disabled]="busy" (change)="selectFile($event, option.type)">
            </label>
          </div>
          <aside *ngIf="showOcrGuide" class="ocr-guide" aria-live="polite">
            <div><strong>How OCR review works</strong><p>Capture or upload a document, apply detected fields, then compare every value with the source before you verify and save.</p></div>
            <button type="button" (click)="dismissOcrGuide()" title="Hide this guide on this device">Got it</button>
          </aside>
          <div class="ocr-review-input">
            <label for="manual-ocr-text"><strong>OCR review text</strong><span id="manual-ocr-help">Paste text from an approved scanner when this browser cannot detect text. Only recognised form fields are used.</span></label>
            <textarea id="manual-ocr-text" [(ngModel)]="manualOcrText" [disabled]="busy" maxlength="8000" rows="5" aria-describedby="manual-ocr-help" placeholder="Registration: ABC 123 GP&#10;VIN: ...&#10;Make: Toyota&#10;Model: Hilux&#10;Expiry: 2027-06-30"></textarea>
            <app-ui-button size="sm" variant="secondary" [busy]="busy" (pressed)="applyManualOcrText()">Convert text to form</app-ui-button>
          </div>
        </section>

        <section class="evidence-review" *ngIf="evidence.length">
          <header><h3>Evidence and extraction review</h3><p>Tap an image to zoom before confirming captured values.</p></header>
          <div class="evidence-list">
            <article *ngFor="let item of evidence">
              <button *ngIf="item.previewUrl" type="button" class="preview-button" (click)="openLightbox(item)" [attr.aria-label]="'View ' + evidenceLabel(item.evidenceType)"><img *ngIf="!isImageFailed(item.id)" [src]="item.previewUrl" [alt]="evidenceLabel(item.evidenceType)" (error)="onImageError(item.id)"><span *ngIf="isImageFailed(item.id)" class="thumb-fallback-icon" aria-hidden="true">⚠️</span></button>
              <div><strong>{{ evidenceLabel(item.evidenceType) }}</strong><small>{{ item.fileName }} · {{ provenanceLabel(item) }}</small><span [class.needs-review]="item.extractionState === 'review_required'">{{ extractionLabel(item) }}</span><dl *ngIf="extractedEntries(item).length" class="extracted-fields"><div *ngFor="let field of extractedEntries(item)"><dt>{{ fieldLabel(field[0]) }}</dt><dd>{{ field[1] }}</dd></div></dl></div>
              <div class="evidence-actions">
                <app-ui-button *ngIf="item.extractionState === 'review_required'" size="sm" variant="secondary" [busy]="busy" (pressed)="extractionRequested.emit(item)">Apply values</app-ui-button>
                <app-ui-button *ngIf="isEnhanceAvailable(item)" size="sm" variant="ghost" [busy]="busy" (pressed)="enhanceRequested.emit(item)">Enhance with Cloud OCR</app-ui-button>
              </div>
            </article>
          </div>
        </section>
      </div>

      <!-- Form and verification column -->
      <div class="form-column" [class.full-width]="activeMode() === 'manual'">
        <section class="verification-checkpoint">
          <label>
            <input type="checkbox" [ngModel]="detailsVerified" (ngModelChange)="detailsVerifiedChange.emit($event)" [disabled]="!canComplete || busy">
            <span>
              {{ activeMode() === 'manual' ? 'I verified that all manually entered details match client records and physical equipment.' : 'I verified the captured image and all asset details are correct.' }}
            </span>
          </label>
          <p>{{ canComplete ? 'Verification enables final review and save.' : 'Complete the required fields before verification.' }}</p>
        </section>

        <section class="validation-panel full-row" *ngIf="validationMessages.length" data-testid="asset-registration-validation">
          <strong>Complete before final save</strong>
          <ul><li *ngFor="let message of validationMessages">{{ message }}</li></ul>
        </section>

        <app-ui-feedback class="full-row" *ngIf="message" [message]="message" tone="warning"></app-ui-feedback>
        <app-asset-form
          [asset]="asset"
          [sites]="sites"
          [busy]="busy"
          [message]="error"
          [canSubmit]="canComplete && detailsVerified"
          [submitDisabledReason]="completionBlocker"
          [submitLabel]="asset.id ? 'Verify and save asset' : 'Review and save asset'"
          (changed)="detailsVerifiedChange.emit(false)"
          (save)="openConfirmation()"
        ></app-asset-form>

        <section class="reminder-preview full-row" *ngIf="reminders.length">
          <header><h3>Licence reminder schedule</h3><p>Device notifications cover renewal and the 30-day grace window.</p></header>
          <ol><li *ngFor="let item of reminders"><span>{{ dateLabel(item.scheduledAt) }}</span><strong>{{ item.title }}</strong><small>{{ item.phase === 'expiry' ? 'Renewal' : 'Grace period' }}</small></li></ol>
        </section>
      </div>

      <!-- Lightbox modal -->
      <div
        class="image-lightbox"
        *ngIf="zoomedEvidence"
        role="dialog"
        aria-modal="true"
        aria-label="Evidence preview lightbox"
        (click)="closeLightbox()"
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
      >
        <div class="lightbox-modal" (click)="$event.stopPropagation()">
          <header class="lightbox-header">
            <div class="lightbox-meta">
              <span class="lightbox-counter" *ngIf="previewableEvidence.length > 1" aria-live="polite">
                Evidence {{ zoomedEvidenceIndex + 1 }} of {{ previewableEvidence.length }}
              </span>
              <strong>{{ evidenceLabel(zoomedEvidence.evidenceType) }}</strong>
              <small>{{ zoomedEvidence.fileName }}</small>
            </div>
            <button
              type="button"
              class="lightbox-close-btn"
              (click)="closeLightbox()"
              aria-label="Close image preview"
            >
              ✕
            </button>
          </header>

          <div class="lightbox-stage">
            <button
              *ngIf="previewableEvidence.length > 1"
              type="button"
              class="lightbox-nav lightbox-prev"
              (click)="prevEvidence()"
              aria-label="Previous evidence"
            >
              ‹
            </button>

            <div class="lightbox-content">
              <ng-container *ngIf="!isImageFailed(zoomedEvidence.id); else imageErrorFallback">
                <img
                  *ngIf="zoomedEvidence.previewUrl"
                  [src]="zoomedEvidence.previewUrl"
                  [alt]="evidenceLabel(zoomedEvidence.evidenceType)"
                  (error)="onImageError(zoomedEvidence.id)"
                  class="lightbox-image"
                />
              </ng-container>
              <ng-template #imageErrorFallback>
                <div class="image-error-fallback" role="alert">
                  <span class="error-badge">Image preview unavailable</span>
                  <p>Failed to load media for {{ zoomedEvidence.fileName }}. The file may be corrupt or the link may have expired.</p>
                  <button type="button" class="retry-btn" (click)="retryImage(zoomedEvidence.id)">Retry preview</button>
                </div>
              </ng-template>
            </div>

            <button
              *ngIf="previewableEvidence.length > 1"
              type="button"
              class="lightbox-nav lightbox-next"
              (click)="nextEvidence()"
              aria-label="Next evidence"
            >
              ›
            </button>
          </div>

          <footer class="lightbox-strip" *ngIf="previewableEvidence.length > 1">
            <div class="thumbnail-strip" role="tablist" aria-label="Evidence thumbnails">
              <button
                *ngFor="let item of previewableEvidence; let idx = index"
                type="button"
                class="thumb-tile"
                [class.active]="item.id === zoomedEvidence.id"
                [attr.aria-selected]="item.id === zoomedEvidence.id"
                [attr.aria-label]="'Go to evidence ' + (idx + 1) + ' of ' + previewableEvidence.length + ': ' + evidenceLabel(item.evidenceType)"
                (click)="selectEvidence(item)"
              >
                <img *ngIf="item.previewUrl && !isImageFailed(item.id)" [src]="item.previewUrl" [alt]="evidenceLabel(item.evidenceType)" (error)="onImageError(item.id)" />
                <span *ngIf="isImageFailed(item.id)" class="thumb-fallback-icon" aria-hidden="true">⚠️</span>
                <span class="thumb-index">{{ idx + 1 }}</span>
              </button>
            </div>
          </footer>
        </div>
      </div>

      <!-- Confirmation modal -->
      <div class="confirmation-backdrop" *ngIf="confirmationOpen" (click)="confirmationOpen = false">
        <section class="confirmation-modal" (click)="$event.stopPropagation()">
          <header><h3>Confirm asset registration</h3><button type="button" (click)="confirmationOpen = false" aria-label="Close confirmation">Close</button></header>
          <div class="confirmation-body">
            <button *ngIf="primaryEvidence() as image" type="button" class="confirmation-image" (click)="openLightbox(image)"><img [src]="image.previewUrl" [alt]="evidenceLabel(image.evidenceType)"></button>
            <dl>
              <div><dt>Identifier</dt><dd>{{ summaryIdentifier() }}</dd></div>
              <div><dt>Asset</dt><dd>{{ asset.make }} {{ asset.model }}</dd></div>
              <div><dt>Year / Acquired</dt><dd>{{ asset.yearModel || '—' }} / {{ asset.dateAcquired || '—' }}</dd></div>
              <div><dt>Class</dt><dd>{{ asset.assetClass || asset.type }}</dd></div>
              <div><dt>Site</dt><dd>{{ siteName(asset.assignedSiteId) }}</dd></div>
              <div><dt>Custodian</dt><dd>{{ asset.custodianName || 'Not assigned' }}</dd></div>
              <div><dt>Licence / compliance</dt><dd>{{ asset.licenseExpiry }}</dd></div>
              <div><dt>Verification mode</dt><dd class="capitalize font-bold text-yellow-400">{{ activeMode() }}</dd></div>
            </dl>
          </div>
          <footer><button type="button" class="secondary" (click)="confirmationOpen = false">Back to details</button><button type="button" [disabled]="!isReadyToComplete()" (click)="completeRegistration()">Save asset</button></footer>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .workflow { display: grid; grid-template-columns: minmax(280px,.95fr) minmax(360px,1.05fr); gap: 12px; align-items: start; }
    .workflow.manual-layout { grid-template-columns: 1fr; }
    .full-row { grid-column: 1/-1; }
    .ocr-column { display: grid; gap: 12px; }
    .form-column { display: grid; gap: 12px; }
    .form-column.full-width { max-width: 860px; margin: 0 auto; width: 100%; }

    /* Mode Selector Strip */
    .mode-selector-strip { padding: 4px; border: 1px solid #33404d; border-radius: 8px; background: #0c1218; }
    .mode-selector-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .mode-pill { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #273440; border-radius: 6px; background: #131b23; color: #a5b4c4; cursor: pointer; text-align: left; transition: all .15s ease; }
    .mode-pill:hover { border-color: #48596a; background: #18222c; color: #f2f5f8; }
    .mode-pill.active { border-color: #f59e0b; background: #1f2a36; color: #ffffff; box-shadow: 0 0 0 1px rgba(245, 158, 11, .3); }
    .mode-glyph { font-size: 18px; line-height: 1; flex-shrink: 0; }
    .mode-label { display: grid; gap: 2px; }
    .mode-label strong { font-size: 12px; font-weight: 700; color: #f2f5f8; }
    .mode-label small { font-size: 10px; color: #8797a7; }
    .mode-pill.active .mode-label small { color: #cbd5e1; }
    .rec-tag { position: absolute; top: 6px; right: 8px; padding: 1px 6px; border-radius: 4px; background: #f59e0b; color: #0f172a; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }

    /* Manual Mode Notice */
    .manual-mode-notice { padding: 12px 14px; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #e2e8f0; }
    .notice-body { display: flex; align-items: center; gap: 12px; }
    .notice-icon { font-size: 24px; line-height: 1; }
    .notice-body strong { display: block; font-size: 13px; color: #f8fafc; }
    .notice-body p { margin: 2px 0 0; font-size: 11px; color: #94a3b8; line-height: 1.4; }

    .registration-status { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid #33404d; border-radius: 6px; background: #151d25; }
    .registration-status>div { display: grid; grid-template-columns: 8px auto; align-items: center; gap: 2px 8px; }
    .registration-status>div>span { width: 8px; height: 8px; border-radius: 50%; background: #f4c542; }
    .registration-status small { grid-column: 2; color: #8e9aa7; }
    .capture-workspace,.evidence-review,.reminder-preview,.verification-checkpoint,.validation-panel { padding: 10px; border: 1px solid var(--sds-color-border, #2d3945); border-radius: var(--sds-radius-sm, 6px); background: var(--sds-color-surface, #10171e); }
    header h3 { margin: 0; color: #f2f5f8; font-size: 14px; }
    header p,.verification-checkpoint p { margin: 4px 0 0; color: #8f9dab; font-size: 12px; line-height: 1.5; }
    .capture-grid,.document-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 10px; }
    .capture-grid button { display: grid; min-height: 78px; place-items: center; align-content: center; gap: 5px; padding: 10px; border: 1px solid #3b4855; border-radius: 6px; background: #18222c; color: #f5f7f9; font: inherit; cursor: pointer; }
    .capture-grid button:hover:not(:disabled) { border-color: #e0b93c; background: #1d2833; }
    .capture-grid button:disabled,.document-grid input:disabled { cursor: not-allowed; opacity: .5; }
    .capture-grid button>span { color: #f0c746; font: 800 10px ui-monospace, monospace; }
    .capture-grid small,.document-grid label span,.document-grid input { color: #8998a6; font-size: 10px; }
    .document-grid { margin-top: 10px; }
    .document-grid label { display: grid; gap: 3px; padding: 8px; border: 1px dashed #465463; border-radius: 6px; color: #dfe5ea; cursor: pointer; }
    .document-grid input { width: 100%; margin-top: 5px; }
    .ocr-guide { display:flex; justify-content:space-between; gap:12px; margin-top:10px; padding:10px; border-left:3px solid #eab308; border-radius:4px; background:rgba(234,179,8,.08); color:#e8edf1; font-size:12px; }
    .ocr-guide p { margin:4px 0 0; color:#aab7c3; line-height:1.45; }
    .ocr-guide button { align-self:start; border:1px solid #637181; border-radius:4px; background:#18222c; color:#edf2f7; padding:5px 8px; white-space:nowrap; }
    .ocr-review-input { display:grid; gap:7px; margin-top:10px; padding:10px; border:1px solid #3b4855; border-radius:6px; background:#131c24; }
    .ocr-review-input label { display:grid; gap:3px; } .ocr-review-input label span { color:#9aa8b5; font-size:11px; line-height:1.4; }
    .ocr-review-input textarea { min-height:92px; resize:vertical; border:1px solid #465463; border-radius:5px; padding:8px; background:#0e151c; color:#edf2f7; font:12px/1.45 ui-monospace,monospace; }
    .evidence-list { display: grid; gap: 8px; margin-top: 12px; }
    .evidence-list article { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 10px; min-height: 58px; padding: 7px; border-bottom: 1px solid #293541; }
    .preview-button { width: 56px; height: 48px; padding: 0; border: 0; border-radius: 4px; background: transparent; cursor: zoom-in; }
    .preview-button img,.evidence-list img { width: 56px; height: 48px; border-radius: 4px; object-fit: cover; }
    .evidence-list article>div { display: grid; gap: 2px; }
    .evidence-list small,.evidence-list span { color: #8795a3; font-size: 10px; }
    .evidence-list .needs-review { color: #f0c746; }
    .extracted-fields { grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px 8px; margin:5px 0 0; } .extracted-fields dt { font-size:9px; } .extracted-fields dd { overflow-wrap:anywhere; font-size:10px; }
    .validation-panel { border-color: rgba(234, 179, 8, .32); background: var(--sds-color-accent-soft, rgba(234,179,8,.1)); color: var(--sds-color-text, #f2f5f8); }
    .validation-panel strong { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .validation-panel ul { display: grid; gap: 5px; margin: 8px 0 0; padding-left: 18px; color: #fde68a; font-size: 12px; }
    .verification-checkpoint label { display: flex; align-items: center; gap: 10px; color: #eef3f7; font-weight: 700; }
    .verification-checkpoint input { width: 18px; height: 18px; accent-color: #eab308; }
    ol { display: grid; margin: 12px 0 0; padding: 0; list-style: none; }
    li { display: grid; grid-template-columns: 92px 1fr auto; gap: 10px; padding: 8px 0; border-bottom: 1px solid #293541; color: #dce3e8; font-size: 11px; }
    li span,li small { color: #8493a1; }
    
    .image-lightbox,.confirmation-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(3,7,12,.88); backdrop-filter: blur(4px); }
    .lightbox-modal { display: flex; flex-direction: column; width: min(980px, 96vw); max-height: 94vh; border: 1px solid #3b4855; border-radius: 8px; background: #0f171f; box-shadow: 0 24px 80px rgba(0,0,0,.55); overflow: hidden; }
    .lightbox-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #283542; background: #131c25; }
    .lightbox-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: #f2f5f8; font-size: 13px; }
    .lightbox-meta small { color: #8fa0b0; font-size: 11px; }
    .lightbox-counter { padding: 2px 8px; border-radius: 4px; background: #eab308; color: #111827; font-size: 11px; font-weight: 800; letter-spacing: .02em; }
    .lightbox-close-btn { min-width: 36px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #566575; border-radius: 6px; background: #1a2530; color: #f7fafc; font-size: 14px; cursor: pointer; }
    .lightbox-close-btn:hover { background: #243242; border-color: #cbd5e1; }
    .lightbox-stage { position: relative; display: flex; align-items: center; justify-content: space-between; flex: 1; min-height: 280px; max-height: 68vh; background: #070b0e; overflow: hidden; user-select: none; }
    .lightbox-content { flex: 1; display: flex; align-items: center; justify-content: center; height: 100%; max-height: 68vh; padding: 12px; overflow: hidden; }
    .lightbox-image { max-width: 100%; max-height: 66vh; object-fit: contain; border-radius: 4px; }
    .lightbox-nav { z-index: 10; min-width: 44px; min-height: 44px; border: 1px solid #4a5968; border-radius: 50%; background: rgba(17,26,34,.82); color: #f7fafc; font-size: 26px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s ease, transform .1s ease; margin: 0 12px; }
    .lightbox-nav:hover { background: #eab308; color: #111827; border-color: #eab308; }
    .lightbox-nav:active { transform: scale(0.95); }
    .lightbox-strip { padding: 10px 16px; border-top: 1px solid #283542; background: #101822; }
    .thumbnail-strip { display: flex; gap: 8px; overflow-x: auto; }
    .thumb-tile { position: relative; width: 48px; height: 42px; padding: 0; border: 1px solid #374756; border-radius: 4px; background: #1a2632; cursor: pointer; flex-shrink: 0; }
    .thumb-tile.active { border-color: #eab308; box-shadow: 0 0 0 2px #eab308; }
    .thumb-tile img { width: 100%; height: 100%; object-fit: cover; border-radius: 3px; }
    .thumb-index { position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,.7); color: #fff; font-size: 8px; padding: 1px 3px; border-radius: 2px; }
    .image-error-fallback { display: grid; place-items: center; text-align: center; gap: 8px; padding: 24px; color: #f87171; }
    .error-badge { padding: 4px 10px; border-radius: 4px; background: rgba(239,68,68,.15); font-weight: 700; font-size: 12px; }
    .retry-btn { border: 1px solid #ef4444; border-radius: 4px; background: transparent; color: #f87171; padding: 6px 12px; cursor: pointer; }
    .confirmation-modal { width: min(760px, 96vw); border: 1px solid #42505f; border-radius: 8px; background: #0f171f; color: #eef3f7; box-shadow: 0 24px 80px rgba(0,0,0,.38); }
    .confirmation-modal header,.confirmation-modal footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #283542; }
    .confirmation-modal footer { border-top: 1px solid #283542; border-bottom: 0; }
    .confirmation-body { display: grid; grid-template-columns: 180px 1fr; gap: 16px; padding: 16px; }
    .confirmation-image { padding: 0; border: 1px solid #394857; border-radius: 6px; background: #0b1117; cursor: zoom-in; overflow: hidden; }
    .confirmation-image img { width: 100%; height: 160px; object-fit: cover; display: block; }
    dl { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin: 0; }
    dt { color: #8998a6; font-size: 10px; text-transform: uppercase; } dd { margin: 2px 0 0; font-weight: 700; }
    .confirmation-modal footer button { border: 0; border-radius: 6px; padding: 10px 14px; font-weight: 800; }
    .confirmation-modal footer button:last-child { background: #eab308; color: #111827; } .confirmation-modal footer .secondary { background: #263241; color: #edf2f7; }
    .confirmation-modal footer button:disabled { cursor: not-allowed; opacity: .55; }
    @media (max-width:980px) { .workflow { grid-template-columns:1fr; } .mode-selector-tabs { grid-template-columns: 1fr; } }
    @media (max-width:760px) { .capture-grid,.document-grid,.confirmation-body,dl { grid-template-columns:1fr; } .ocr-guide { align-items:stretch; flex-direction:column; } .capture-grid button { min-height:82px; } .registration-status { position:sticky; top:0; z-index:4; } .evidence-list article { grid-template-columns:48px 1fr; } .preview-button,.preview-button img,.evidence-list img { width:48px; } .evidence-list app-ui-button { grid-column:1/-1; } li { grid-template-columns:82px 1fr; } li small { grid-column:2; } .confirmation-modal header,.confirmation-modal footer { align-items: stretch; flex-direction: column; } .confirmation-modal header button { justify-self: stretch; } }
  `],
})
export class AssetRegistrationWorkspaceComponent implements OnDestroy {
  readonly activeMode = signal<AssetVerificationMode>('combo');

  readonly captureOptions: Array<{ type: AssetEvidenceType; symbol: string; label: string; detail: string }> = [
    { type: 'asset_photo', symbol: 'CAM', label: 'Asset photo', detail: 'Overall condition and identity' },
    { type: 'number_plate', symbol: 'SCAN', label: 'Serial or number plate', detail: 'OCR or barcode assisted capture' },
    { type: 'licence_disc', symbol: 'OCR', label: 'Licence disc', detail: 'Expiry and registration evidence' },
  ];
  readonly documentOptions: Array<{ type: AssetEvidenceType; label: string }> = [
    { type: 'registration_document', label: 'Registration document' },
    { type: 'purchase_invoice', label: 'Purchase invoice' },
    { type: 'other', label: 'Other evidence' },
  ];

  @Input({ required: true }) asset!: VehicleAsset;
  @Input() sites: Site[] = [];
  @Input() draft: AssetRegistrationDraft | null = null;
  @Input() evidence: AssetRegistrationEvidence[] = [];
  @Input() reminders: AssetReminderMilestone[] = [];
  @Input() busy = false;
  @Input() message = '';
  @Input() error = '';
  @Input() canComplete = false;
  @Input() completionBlocker = '';
  @Input() validationMessages: string[] = [];
  @Input() detailsVerified = false;
  @Input() set mode(value: AssetVerificationMode | undefined) {
    if (value) this.activeMode.set(value);
  }
  @Output() readonly modeChange = new EventEmitter<AssetVerificationMode>();
  @Output() readonly draftSaveRequested = new EventEmitter<void>();
  @Output() readonly captureRequested = new EventEmitter<AssetEvidenceType>();
  @Output() readonly fileSelected = new EventEmitter<AssetEvidenceFileSelection>();
  @Output() readonly extractionRequested = new EventEmitter<AssetRegistrationEvidence>();
  @Output() readonly enhanceRequested = new EventEmitter<AssetRegistrationEvidence>();
  @Output() readonly manualExtractionRequested = new EventEmitter<string>();
  @Output() readonly completionRequested = new EventEmitter<void>();
  @Output() readonly detailsVerifiedChange = new EventEmitter<boolean>();

  confirmationOpen = false;
  private readonly _zoomedEvidence = signal<AssetRegistrationEvidence | null>(null);
  private readonly _zoomedEvidenceIndex = signal<number>(-1);
  private readonly _failedImageIds = signal<Set<string>>(new Set<string>());

  get zoomedEvidence(): AssetRegistrationEvidence | null {
    return this._zoomedEvidence();
  }
  set zoomedEvidence(value: AssetRegistrationEvidence | null) {
    this._zoomedEvidence.set(value);
  }

  get zoomedEvidenceIndex(): number {
    return this._zoomedEvidenceIndex();
  }
  set zoomedEvidenceIndex(value: number) {
    this._zoomedEvidenceIndex.set(value);
  }

  touchStartX: number | null = null;
  touchStartY: number | null = null;

  get previewableEvidence(): AssetRegistrationEvidence[] {
    const withPreview = this.evidence.filter((item) => Boolean(item.previewUrl));
    if (withPreview.length > 0) {
      return withPreview;
    }
    const current = this._zoomedEvidence();
    return current ? [current] : [];
  }

  setMode(mode: AssetVerificationMode) {
    this.activeMode.set(mode);
    this.modeChange.emit(mode);
  }

  openLightbox(item: AssetRegistrationEvidence) {
    this._zoomedEvidence.set(item);
    const list = this.previewableEvidence;
    const index = list.findIndex((e) => e.id === item.id);
    this._zoomedEvidenceIndex.set(index >= 0 ? index : 0);
    this.lockBodyScroll();
  }

  closeLightbox() {
    this._zoomedEvidence.set(null);
    this._zoomedEvidenceIndex.set(-1);
    this.unlockBodyScroll();
  }

  nextEvidence() {
    const list = this.previewableEvidence;
    if (list.length <= 1) return;
    const nextIdx = (this._zoomedEvidenceIndex() + 1) % list.length;
    this._zoomedEvidenceIndex.set(nextIdx);
    this._zoomedEvidence.set(list[nextIdx]);
  }

  prevEvidence() {
    const list = this.previewableEvidence;
    if (list.length <= 1) return;
    const prevIdx = (this._zoomedEvidenceIndex() - 1 + list.length) % list.length;
    this._zoomedEvidenceIndex.set(prevIdx);
    this._zoomedEvidence.set(list[prevIdx]);
  }

  selectEvidence(item: AssetRegistrationEvidence) {
    this._zoomedEvidence.set(item);
    const list = this.previewableEvidence;
    const index = list.findIndex((e) => e.id === item.id);
    this._zoomedEvidenceIndex.set(index >= 0 ? index : 0);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this._zoomedEvidence()) return;
    if (event.key === 'Escape') {
      this.closeLightbox();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.nextEvidence();
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      this.prevEvidence();
      event.preventDefault();
    }
  }

  onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches?.[0];
    if (touch) {
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (this.touchStartX === null || this.touchStartY === null) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    this.touchStartX = null;
    this.touchStartY = null;

    if (Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        this.nextEvidence();
      } else {
        this.prevEvidence();
      }
    }
  }

  onImageError(id: string) {
    this._failedImageIds.update((set) => new Set(set).add(id));
  }

  retryImage(id: string) {
    this._failedImageIds.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  isImageFailed(id: string): boolean {
    return this._failedImageIds().has(id);
  }

  private lockBodyScroll() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = 'hidden';
    }
  }

  private unlockBodyScroll() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
  }

  manualOcrText = '';
  showOcrGuide = this.shouldShowOcrGuide();

  stateLabel(state: AssetRegistrationDraft['state']) {
    return { draft: 'Draft', review_required: 'Review required', ready: 'Ready to register', completed: 'Completed' }[state];
  }

  evidenceLabel(type: AssetEvidenceType) {
    return { asset_photo: 'Asset photo', number_plate: 'Serial or number plate', licence_disc: 'Licence disc', registration_document: 'Registration document', purchase_invoice: 'Purchase invoice', other: 'Other evidence' }[type];
  }

  provenanceLabel(evidence: AssetRegistrationEvidence) {
    const source = {
      native_scan: 'Native document scan',
      native_camera: 'Device camera',
      upload: 'Uploaded file',
      manual: 'Manual evidence',
    }[evidence.captureSource];
    const confidence = evidence.ocrConfidence === null ? '' : ` · OCR ${Math.round(evidence.ocrConfidence * 100)}%`;
    return `${source}${confidence}`;
  }

  extractionLabel(evidence: AssetRegistrationEvidence) {
    if (evidence.extractionState === 'review_required') return 'Values detected - apply and verify';
    if (evidence.extractionState === 'pending') return 'Saved for manual review';
    if (evidence.extractionState === 'applied') return 'Values applied';
    return 'Attached';
  }

  isEnhanceAvailable(evidence: AssetRegistrationEvidence): boolean {
    if (evidence.extractionState === 'applied' || !['licence_disc', 'registration_document', 'purchase_invoice', 'number_plate'].includes(evidence.evidenceType)) {
      return false;
    }
    const quality = evaluateOcrQuality(evidence.extractedFields, evidence.evidenceType, evidence.ocrConfidence);
    return quality.requiresCloudEnhance;
  }

  qualityLabel(evidence: AssetRegistrationEvidence): string {
    const quality = evaluateOcrQuality(evidence.extractedFields, evidence.evidenceType, evidence.ocrConfidence);
    if (!quality.requiresCloudEnhance) return 'High confidence';
    return quality.reasons[0] || 'Enhancement recommended';
  }

  applyManualOcrText() {
    const raw = this.manualOcrText.trim();
    if (!raw || this.busy) return;
    this.manualExtractionRequested.emit(raw);
  }

  extractedEntries(evidence: AssetRegistrationEvidence) {
    return Object.entries(evidence.extractedFields).filter(([, value]) => Boolean(value));
  }

  fieldLabel(field: string) {
    return { registrationNumber: 'Registration', vin: 'VIN', serialNumber: 'Serial', make: 'Make', model: 'Model', licenseExpiry: 'Licence expiry' }[field] || field;
  }

  dismissOcrGuide() {
    this.showOcrGuide = false;
    try { localStorage.setItem('senatla.asset-registration.ocr-guide.dismissed', 'true'); } catch { /* Preference is optional. */ }
  }

  dateLabel(date: Date) {
    return new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  selectFile(event: Event, evidenceType: AssetEvidenceType) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit({ file, evidenceType });
    input.value = '';
  }

  private shouldShowOcrGuide() {
    try { return localStorage.getItem('senatla.asset-registration.ocr-guide.dismissed') !== 'true'; } catch { return true; }
  }

  openConfirmation() {
    if (this.isReadyToComplete()) this.confirmationOpen = true;
  }

  completeRegistration() {
    if (!this.isReadyToComplete()) return;
    this.confirmationOpen = false;
    this.asset.verificationStatus = 'verified';
    this.asset.verifiedAt = new Date().toISOString();
    this.asset.verificationMode = this.activeMode();
    this.completionRequested.emit();
  }

  isReadyToComplete() {
    return this.canComplete && this.detailsVerified && !this.busy;
  }

  primaryEvidence() {
    return this.evidence.find((item) => item.previewUrl) || null;
  }

  summaryIdentifier() {
    return this.asset.registrationNumber || this.asset.vin || this.asset.serialNumber || 'Missing identifier';
  }

  siteName(siteId?: string) {
    return this.sites.find((site) => site.id === siteId)?.name || 'Unassigned';
  }
}
