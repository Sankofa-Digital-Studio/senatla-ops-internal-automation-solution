import { Injectable, inject, signal } from '@angular/core';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config/runtime-config';

export type PublicAnalyticsEvent = 'landing_view' | 'sign_in_click' | 'apk_download';
export type AnalyticsChoice = 'accepted' | 'declined' | null;

const CONSENT_VERSION = '1';
const CONSENT_KEY = `senatla.analytics.consent.v${CONSENT_VERSION}`;
const ALLOWED_EVENTS: ReadonlySet<string> = new Set<PublicAnalyticsEvent>([
  'landing_view', 'sign_in_click', 'apk_download',
]);

type AnalyticsRuntimeConfig = RuntimeConfig & {
  analytics?: { measurementId?: string };
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly config = inject(RUNTIME_CONFIG) as AnalyticsRuntimeConfig;
  readonly choice = signal<AnalyticsChoice>(this.readChoice());
  private readonly measurementId = this.validMeasurementId(this.config.analytics?.measurementId);
  private scriptInstalled = false;
  private landingViewed = false;
  private landingSent = false;

  get enabled(): boolean {
    return Boolean(this.measurementId);
  }

  record(event: PublicAnalyticsEvent): void {
    // Accept only exact event names. The API deliberately takes no payload.
    if (!ALLOWED_EVENTS.has(event) || !this.enabled) return;
    if (event === 'landing_view') {
      if (this.landingViewed) return;
      this.landingViewed = true;
    }
    if (this.choice() !== 'accepted') return;
    this.installScript();
    if (event === 'landing_view') this.sendLandingView();
    else this.gtag('event', event);
  }

  accept(): void {
    this.setChoice('accepted');
    if (!this.enabled) return;
    this.installScript();
    this.sendLandingView();
  }

  decline(): void {
    this.setChoice('declined');
  }

  private setChoice(choice: Exclude<AnalyticsChoice, null>): void {
    const previous = this.choice();
    this.choice.set(choice);
    try { localStorage.setItem(CONSENT_KEY, choice); } catch { /* Session-only choice. */ }
    if (previous === 'accepted' && choice === 'declined') {
      this.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  private readChoice(): AnalyticsChoice {
    try {
      const choice = localStorage.getItem(CONSENT_KEY);
      return choice === 'accepted' || choice === 'declined' ? choice : null;
    } catch { return null; }
  }

  private validMeasurementId(value: unknown): string {
    const id = typeof value === 'string' ? value.trim() : '';
    return /^G-[A-Z0-9]{6,20}$/.test(id) ? id : '';
  }

  private sendLandingView(): void {
    if (!this.landingViewed || this.landingSent) return;
    this.landingSent = true;
    this.gtag('event', 'landing_view');
  }

  private installScript(): void {
    if (this.scriptInstalled || !this.measurementId || typeof document === 'undefined') return;
    this.scriptInstalled = true;
    this.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    this.gtag('js', new Date());
    this.gtag('config', this.measurementId, {
      send_page_view: false,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    script.dataset['senatlaAnalytics'] = 'true';
    document.head.appendChild(script);
  }

  private gtag(...args: unknown[]): void {
    const analyticsWindow = window as Window & { dataLayer?: unknown[] };
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.dataLayer.push(args);
  }
}
