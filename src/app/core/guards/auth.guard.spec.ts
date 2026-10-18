import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { roleCanActivate } from './auth.guard';

describe('roleCanActivate', () => {
  beforeEach(async () => {
    resetTestStorage();
    await TestBed.configureTestingModule({ providers: TEST_APP_PROVIDERS }).compileComponents();
  });

  it('redirects anonymous users to the requested role login', async () => {
    const router = TestBed.inject(Router);
    const result = await TestBed.runInInjectionContext(() =>
      roleCanActivate('office')({} as never, { url: '/office-admin' } as never),
    );

    expect(result).not.toBeTrue();
    expect(router.serializeUrl(result as never)).toContain('/login/office');
    expect(router.serializeUrl(result as never)).toContain('redirect=%2Foffice-admin');
  });

  it('redirects anonymous multi-role routes to the preferred role login', async () => {
    const router = TestBed.inject(Router);
    const result = await TestBed.runInInjectionContext(() =>
      roleCanActivate(['site', 'office', 'director'], 'office')({} as never, { url: '/asset-register' } as never),
    );

    expect(result).not.toBeTrue();
    expect(router.serializeUrl(result as never)).toBe('/login/office?redirect=%2Fasset-register');
  });
  it('permits only the authenticated role', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login('office.admin@test.invalid', 'test-password');

    const officeResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('office')({} as never, { url: '/office-admin' } as never),
    );
    expect(officeResult).toBeTrue();

    const directorResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('director')({} as never, { url: '/director' } as never),
    );
    expect(directorResult).not.toBeTrue();
    expect(auth.isAuthenticated()).toBeFalse();
  });

  it('permits any authenticated role in an allowed role set', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login('director.exec@test.invalid', 'test-password');

    const result = await TestBed.runInInjectionContext(() =>
      roleCanActivate(['site', 'office', 'director'])({} as never, { url: '/asset-register' } as never),
    );

    expect(result).toBeTrue();
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('forces temporary-password accounts into password setup before granting protected routes', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    await auth.login('readonly.user@test.invalid', 'temp-password');

    expect(auth.canAccess()).toBeFalse();
    const result = await TestBed.runInInjectionContext(() =>
      roleCanActivate('readonly')({} as never, { url: '/read-only' } as never),
    );

    expect(result).not.toBeTrue();
    expect(router.serializeUrl(result as never)).toBe('/login/recovery');
  });

  it('permits the read-only role only on its dedicated workspace route', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login('readonly.reader@test.invalid', 'test-password');

    const readOnlyResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('readonly')({} as never, { url: '/read-only' } as never),
    );
    expect(readOnlyResult).toBeTrue();

    const siteResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('site')({} as never, { url: '/site-manager' } as never),
    );
    expect(siteResult).not.toBeTrue();
    expect(auth.isAuthenticated()).toBeFalse();
  });
});
