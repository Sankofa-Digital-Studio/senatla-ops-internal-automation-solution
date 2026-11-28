import { SessionDataCacheService } from './session-data-cache.service';

describe('SessionDataCacheService', () => {
  const cacheKey = 'senatla_ops_session_data_v1';
  const dashboardKey = 'senatla_domain_dashboard_v1';
  const cache = new SessionDataCacheService();

  beforeEach(() => cache.clear());
  afterEach(() => cache.clear());

  it('preserves independent datasets across service instances', () => {
    cache.set('first', [1]);
    cache.set('second', { count: 0 });

    const reloaded = new SessionDataCacheService();
    expect(reloaded.get('first')).toEqual([1]);
    expect(reloaded.get('second')).toEqual({ count: 0 });
  });

  it('allows a fresh write after a corrupt cache entry', () => {
    sessionStorage.setItem(cacheKey, '{invalid');
    expect(cache.get('first')).toBeNull();

    cache.set('first', [1]);
    expect(cache.get('first')).toEqual([1]);
  });

  it('clears both workspace and legacy dashboard entries during cleanup', () => {
    cache.set('first', [1]);
    sessionStorage.setItem(dashboardKey, '{}');

    cache.clear();

    expect(cache.get('first')).toBeNull();
    expect(sessionStorage.getItem(dashboardKey)).toBeNull();
  });

  it('tolerates unavailable session storage', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('Read denied');
    spyOn(Storage.prototype, 'setItem').and.throwError('Write denied');
    expect(cache.get('first')).toBeNull();
    expect(() => cache.set('first', [1])).not.toThrow();
  });
});
