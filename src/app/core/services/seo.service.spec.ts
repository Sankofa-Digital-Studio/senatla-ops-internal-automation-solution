import { TestBed } from '@angular/core/testing';
import { provideRuntimeConfig, DEFAULT_RUNTIME_CONFIG } from '../config/runtime-config';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRuntimeConfig(DEFAULT_RUNTIME_CONFIG)] });
    service = TestBed.inject(SeoService);
  });

  it('indexes only landing and removes its canonical on protected routes', () => {
    service.applyRoute('/landing');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://senatla-ops.vercel.app/landing');
    service.applyRoute('/login/recovery');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow, noarchive');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    service.applyRoute('/director');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow, noarchive');
  });
});
