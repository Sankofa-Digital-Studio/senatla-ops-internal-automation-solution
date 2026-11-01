import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
  selector: '[appAccessibleDialog]',
  standalone: true,
})
export class AccessibleDialogDirective implements OnInit, OnChanges, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input('appAccessibleDialog') isOpen = true;
  @Input() announceError = '';
  @Input() initialFocusSelector?: string;
  @Output() dialogClose = new EventEmitter<void>();

  private previouslyFocusedElement: HTMLElement | null = null;
  private liveRegion: HTMLElement | null = null;
  private isDestroyed = false;

  ngOnInit() {
    this.setupLiveRegion();
    if (this.isOpen) {
      this.captureAndFocus();
    }
    if (this.announceError) {
      this.announceErrorMessage(this.announceError);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.captureAndFocus();
      } else {
        this.restoreFocus();
      }
    }

    if (changes['announceError']) {
      this.announceErrorMessage(this.announceError);
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.restoreFocus();
    this.teardownLiveRegion();
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.isOpen) return;

    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      event.stopPropagation();
      this.dialogClose.emit();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private captureAndFocus() {
    if (typeof document === 'undefined') return;
    this.previouslyFocusedElement = document.activeElement as HTMLElement | null;

    setTimeout(() => {
      if (this.isDestroyed || !this.isOpen) return;
      const host = this.elementRef.nativeElement;

      let target: HTMLElement | null = null;
      if (this.initialFocusSelector) {
        target = host.querySelector(this.initialFocusSelector) as HTMLElement | null;
      }
      if (!target) {
        const focusables = this.getFocusableElements();
        target = focusables[0] || null;
      }

      if (target) {
        target.focus();
      } else {
        host.setAttribute('tabindex', '-1');
        host.focus();
      }
    }, 10);
  }

  private restoreFocus() {
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }

  private trapFocus(event: KeyboardEvent) {
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;

    if (event.shiftKey) {
      if (current === first || !this.elementRef.nativeElement.contains(current)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (current === last || !this.elementRef.nativeElement.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const host = this.elementRef.nativeElement;
    const elements = Array.from(host.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
    return elements.filter((el) => el.getAttribute('tabindex') !== '-1');
  }

  private setupLiveRegion() {
    if (typeof document === 'undefined') return;
    const region = document.createElement('div');
    region.setAttribute('role', 'alert');
    region.setAttribute('aria-live', 'assertive');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.padding = '0';
    region.style.margin = '-1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(0, 0, 0, 0)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    this.elementRef.nativeElement.appendChild(region);
    this.liveRegion = region;
  }

  private teardownLiveRegion() {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }

  private announceErrorMessage(message: string) {
    if (!this.liveRegion) return;
    const cleanMessage = (message || '').trim();
    if (!cleanMessage) {
      this.liveRegion.textContent = '';
      return;
    }

    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion && !this.isDestroyed) {
        this.liveRegion.textContent = cleanMessage;
      }
    }, 10);
  }
}
