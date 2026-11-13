import { Injectable } from '@angular/core';

const CACHE_KEY = 'senatla_ops_session_data_v1';

@Injectable({ providedIn: 'root' })
export class SessionDataCacheService {
  private read(): Record<string, unknown> {
    if (typeof sessionStorage === 'undefined') return {};
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  get<T>(dataset: string): T | null {
    const value = this.read()[dataset];
    return value === undefined ? null : (value as T);
  }

  set<T>(dataset: string, value: T): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const cache = this.read();
      cache[dataset] = value;
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Session storage can be unavailable or full; the in-memory signals remain authoritative.
    }
  }

  clear(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem('senatla_domain_dashboard_v1');
    } catch {
      // Ignore unavailable storage during logout.
    }
  }
}
