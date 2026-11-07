import { TestBed } from '@angular/core/testing';
import { provideRuntimeConfig, DEFAULT_RUNTIME_CONFIG } from '../config/runtime-config';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const key = 'senatla.analytics.consent.v1';
  const scripts = () => document.querySelectorAll('script[data-senatla-analytics]');
  const events = () => ((window as Window & { dataLayer?: unknown[] }).dataLayer ?? [])
    .filter((entry): entry is unknown[] => Array.isArray(entry) && entry[0] === 'event')
    .map((entry) => entry.slice(1));

  function makeService(measurementId = 'G-ABCDEF12'): AnalyticsService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRuntimeConfig({
        ...DEFAULT_RUNTIME_CONFIG,
        analytics: { measurementId },
      } as typeof DEFAULT_RUNTIME_CONFIG)],
    });
    return TestBed.inject(AnalyticsService);
  }

  beforeEach(() => {
    localStorage.removeItem(key);
    document.querySelectorAll('script[data-senatla-analytics]').forEach((script) => script.remove());
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
  });

  afterEach(() => {
    document.querySelectorAll('script[data-senatla-analytics]').forEach((script) => script.remove());
    localStorage.removeItem(key);
    TestBed.resetTestingModule();
  });

  it('does not load GA before an explicit acceptance and remembers decline', () => {
    const analytics = makeService();
    analytics.record('landing_view');
    analytics.record('sign_in_click');
    expect(scripts().length).toBe(0);
    expect(events()).toEqual([]);
    analytics.decline();
    expect(localStorage.getItem(key)).toBe('declined');
    analytics.record('apk_download');
    expect(scripts().length).toBe(0);
  });

  it('loads once after acceptance, sends only allowed payload-free events, and avoids duplicate landing views', () => {
    const analytics = makeService();
    analytics.record('landing_view');
    analytics.accept();
    analytics.accept();
    analytics.record('landing_view');
    analytics.record('sign_in_click');
    analytics.record('apk_download');
    analytics.record('user_identity' as never);
    expect(localStorage.getItem(key)).toBe('accepted');
    expect(scripts().length).toBe(1);
    expect(events()).toEqual([
      ['landing_view'], ['sign_in_click'], ['apk_download'],
    ]);
  });

  it('keeps analytics disabled for a blank measurement ID even after acceptance', () => {
    const analytics = makeService('');
    analytics.accept();
    analytics.record('landing_view');
    expect(analytics.enabled).toBeFalse();
    expect(scripts().length).toBe(0);
    expect(events()).toEqual([]);
  });

  it('reads only the current preference version', () => {
    localStorage.setItem('senatla.analytics.consent.v0', 'accepted');
    expect(makeService().choice()).toBeNull();
  });
});
