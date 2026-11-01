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
    await auth.login('thosontula+office@gmail.com', 'test-password');

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
    await auth.login('thosontula+director@gmail.com', 'test-password');

    const result = await TestBed.runInInjectionContext(() =>
      roleCanActivate(['site', 'office', 'director'])({} as never, { url: '/asset-register' } as never),
    );

    expect(result).toBeTrue();
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('blocks every workspace until a temporary password is replaced', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    await auth.login('thosontula+temporary@gmail.com', 'temporary-password');

    const result = await TestBed.runInInjectionContext(() =>
      roleCanActivate('site')({} as never, { url: '/site-manager' } as never),
    );

    expect(result).not.toBeTrue();
    expect(router.serializeUrl(result as never)).toBe('/login/recovery?forced=1');
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('allows exact developer thosontula@gmail.com to switch workspaces while keeping stored role', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login('thosontula@gmail.com', 'test-password');

    expect(auth.isDeveloper()).toBeTrue();
    expect(auth.storedRole()).toBe('director');

    const siteResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('site')({} as never, { url: '/site-manager' } as never),
    );
    expect(siteResult).toBeTrue();
    expect(auth.role()).toBe('site');
    expect(auth.storedRole()).toBe('director'); // Stored role remains untouched

    const officeResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('office')({} as never, { url: '/office-admin' } as never),
    );
    expect(officeResult).toBeTrue();
    expect(auth.role()).toBe('office');
    expect(auth.storedRole()).toBe('director');
  });

  it('blocks developer aliases from cross-workspace switching (anti-escalation)', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login('thosontula+site@gmail.com', 'test-password');

    expect(auth.isDeveloper()).toBeFalse();
    expect(() => auth.switchWorkspace('office')).toThrowError(
      'Cross-workspace switching is restricted to the authorized developer account.',
    );

    const officeResult = await TestBed.runInInjectionContext(() =>
      roleCanActivate('office')({} as never, { url: '/office-admin' } as never),
    );
    expect(officeResult).not.toBeTrue();
    expect(auth.isAuthenticated()).toBeFalse(); // Logged out
  });
});
