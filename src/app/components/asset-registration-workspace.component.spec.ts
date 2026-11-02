import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetRegistrationWorkspaceComponent } from './asset-registration-workspace.component';
import { AssetRegistrationEvidence, VehicleAsset } from '../core/models/app.models';

describe('AssetRegistrationWorkspaceComponent - Bundle 11 Evidence & Media', () => {
  let fixture: ComponentFixture<AssetRegistrationWorkspaceComponent>;
  let component: AssetRegistrationWorkspaceComponent;

  const mockEvidenceList: AssetRegistrationEvidence[] = [
    {
      id: 'ev-1',
      organizationId: 'org-1',
      draftId: 'draft-1',
      uploadedBy: 'user-1',
      evidenceType: 'licence_disc',
      fileName: 'licence-disc.jpg',
      mimeType: 'image/jpeg',
      captureSource: 'native_camera',
      contentSha256: null,
      ocrEngine: 'ios_vision',
      ocrConfidence: 0.95,
      ocrPageCount: 1,
      storageState: 'ready',
      previewUrl: 'https://example.com/disc.jpg',
      extractionState: 'review_required',
      extractedFields: { registrationNumber: 'CA 123 456' },
      createdAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'ev-2',
      organizationId: 'org-1',
      draftId: 'draft-1',
      uploadedBy: 'user-1',
      evidenceType: 'asset_photo',
      fileName: 'vehicle-front.jpg',
      mimeType: 'image/jpeg',
      captureSource: 'native_camera',
      contentSha256: null,
      ocrEngine: null,
      ocrConfidence: null,
      ocrPageCount: 1,
      storageState: 'ready',
      previewUrl: 'https://example.com/front.jpg',
      extractionState: 'not_applicable',
      extractedFields: {},
      createdAt: '2026-11-01T10:05:00Z',
    },
    {
      id: 'ev-3',
      organizationId: 'org-1',
      draftId: 'draft-1',
      uploadedBy: 'user-1',
      evidenceType: 'number_plate',
      fileName: 'plate.jpg',
      mimeType: 'image/jpeg',
      captureSource: 'native_scan',
      contentSha256: null,
      ocrEngine: 'ios_vision',
      ocrConfidence: 0.88,
      ocrPageCount: 1,
      storageState: 'ready',
      previewUrl: 'https://example.com/plate.jpg',
      extractionState: 'applied',
      extractedFields: { registrationNumber: 'CA 123 456' },
      createdAt: '2026-11-01T10:10:00Z',
    },
  ];

  const mockAsset: VehicleAsset = {
    id: 'asset-1',
    make: 'Toyota',
    model: 'Hilux',
    type: 'Light Vehicle',
    licenseExpiry: '2027-01-01',
    status: 'Active',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetRegistrationWorkspaceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetRegistrationWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('asset', mockAsset);
    fixture.componentRef.setInput('evidence', mockEvidenceList);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  });

  it('opens lightbox, selects correct index, and locks body scrolling', () => {
    component.openLightbox(mockEvidenceList[1]);
    fixture.detectChanges();

    expect(component.zoomedEvidence).toBe(mockEvidenceList[1]);
    expect(component.zoomedEvidenceIndex).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    const lightboxEl = fixture.nativeElement.querySelector('.image-lightbox');
    expect(lightboxEl).toBeTruthy();
    expect(lightboxEl.getAttribute('role')).toBe('dialog');
    expect(lightboxEl.getAttribute('aria-modal')).toBe('true');
  });

  it('cycles sequentially through evidence items via nextEvidence and prevEvidence', () => {
    component.openLightbox(mockEvidenceList[0]);
    expect(component.zoomedEvidenceIndex).toBe(0);

    // Forward cycle
    component.nextEvidence();
    expect(component.zoomedEvidenceIndex).toBe(1);
    expect(component.zoomedEvidence?.id).toBe('ev-2');

    component.nextEvidence();
    expect(component.zoomedEvidenceIndex).toBe(2);
    expect(component.zoomedEvidence?.id).toBe('ev-3');

    // Wrap around to start
    component.nextEvidence();
    expect(component.zoomedEvidenceIndex).toBe(0);
    expect(component.zoomedEvidence?.id).toBe('ev-1');

    // Backward cycle (wraps to end)
    component.prevEvidence();
    expect(component.zoomedEvidenceIndex).toBe(2);
    expect(component.zoomedEvidence?.id).toBe('ev-3');
  });

  it('responds to keyboard events (ArrowRight, ArrowLeft, Escape)', () => {
    component.openLightbox(mockEvidenceList[0]);
    fixture.detectChanges();

    // ArrowRight advances
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(component.zoomedEvidenceIndex).toBe(1);

    // ArrowLeft moves back
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.zoomedEvidenceIndex).toBe(0);

    // Escape closes lightbox and restores scroll
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.zoomedEvidence).toBeNull();
    expect(component.zoomedEvidenceIndex).toBe(-1);
    expect(document.body.style.overflow).toBe('');
    expect(fixture.nativeElement.querySelector('.image-lightbox')).toBeNull();
  });

  it('navigates via touch swipe gestures when horizontal delta exceeds threshold', () => {
    component.openLightbox(mockEvidenceList[0]);
    expect(component.zoomedEvidenceIndex).toBe(0);

    // Swipe Left (user drags left from 200 to 120, deltaX = -80) -> next
    component.onTouchStart({ changedTouches: [{ clientX: 200, clientY: 150 }] } as any);
    component.onTouchEnd({ changedTouches: [{ clientX: 120, clientY: 155 }] } as any);
    expect(component.zoomedEvidenceIndex).toBe(1);

    // Swipe Right (user drags right from 100 to 180, deltaX = +80) -> prev
    component.onTouchStart({ changedTouches: [{ clientX: 100, clientY: 150 }] } as any);
    component.onTouchEnd({ changedTouches: [{ clientX: 180, clientY: 145 }] } as any);
    expect(component.zoomedEvidenceIndex).toBe(0);

    // Sub-threshold movement (< 40px) should NOT navigate
    component.onTouchStart({ changedTouches: [{ clientX: 100, clientY: 150 }] } as any);
    component.onTouchEnd({ changedTouches: [{ clientX: 120, clientY: 150 }] } as any);
    expect(component.zoomedEvidenceIndex).toBe(0);

    // Predominantly vertical gesture should NOT navigate
    component.onTouchStart({ changedTouches: [{ clientX: 100, clientY: 100 }] } as any);
    component.onTouchEnd({ changedTouches: [{ clientX: 150, clientY: 300 }] } as any);
    expect(component.zoomedEvidenceIndex).toBe(0);
  });

  it('renders image error fallback card when media loading fails and supports retry', () => {
    component.openLightbox(mockEvidenceList[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.lightbox-image')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.image-error-fallback')).toBeNull();

    // Trigger error on evidence item 1
    component.onImageError('ev-1');
    fixture.detectChanges();

    expect(component.isImageFailed('ev-1')).toBeTrue();
    const fallbackEl = fixture.nativeElement.querySelector('.image-error-fallback');
    expect(fallbackEl).toBeTruthy();
    expect(fallbackEl.getAttribute('role')).toBe('alert');
    expect(fallbackEl.textContent).toContain('Image preview unavailable');

    // Trigger retry
    component.retryImage('ev-1');
    fixture.detectChanges();

    expect(component.isImageFailed('ev-1')).toBeFalse();
    expect(fixture.nativeElement.querySelector('.image-error-fallback')).toBeNull();
    expect(fixture.nativeElement.querySelector('.lightbox-image')).toBeTruthy();
  });

  it('selects arbitrary evidence item directly via thumbnail strip', () => {
    component.openLightbox(mockEvidenceList[0]);
    fixture.detectChanges();

    component.selectEvidence(mockEvidenceList[2]);
    fixture.detectChanges();

    expect(component.zoomedEvidenceIndex).toBe(2);
    expect(component.zoomedEvidence?.id).toBe('ev-3');

    const counterEl = fixture.nativeElement.querySelector('.lightbox-counter');
    expect(counterEl.textContent.trim()).toBe('Evidence 3 of 3');
  });

  it('restores body overflow when destroyed while lightbox is open', () => {
    component.openLightbox(mockEvidenceList[0]);
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});
