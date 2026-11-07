import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { OnboardingService } from './core/services/onboarding.service';
import { resetTestStorage, TEST_APP_PROVIDERS } from './test-providers';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    resetTestStorage();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: TEST_APP_PROVIDERS,
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the app with skip-to-content accessibility link', () => {
    expect(app).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    const skipLink = el.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent?.trim()).toBe('Skip to main content');
    const mainLandmark = el.querySelector('#main-content');
    expect(mainLandmark).not.toBeNull();
  });

  it('computes workspace link based on active role', async () => {
    await auth.login('thosontula+site@gmail.com', 'test-password');
    fixture.detectChanges();
    expect(app.workspaceLink().path).toBe('/site-manager');
    expect(app.workspaceLink().label).toBe('Site workspace');

    await auth.login('thosontula+office@gmail.com', 'test-password');
    fixture.detectChanges();
    expect(app.workspaceLink().path).toBe('/office-admin');
    expect(app.workspaceLink().label).toBe('Operations workspace');

    await auth.login('thosontula+director@gmail.com', 'test-password');
    fixture.detectChanges();
    expect(app.workspaceLink().path).toBe('/director');
    expect(app.workspaceLink().label).toBe('Director workspace');
  });

  it('computes breadcrumbs correctly for deep routes', () => {
    app.currentPath.set('/asset-register');
    fixture.detectChanges();

    const crumbs = app.breadcrumbs();
    expect(crumbs.length).toBe(2);
    expect(crumbs[0].label).toBe('Home');
    expect(crumbs[1].label).toBe('Asset Control');
    expect(app.isDeepRoute()).toBeTrue();
  });

  it('renders offline alert when offline state is true', () => {
    app.isOffline.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const offlineAlert = el.querySelector('[role="status"]');
    expect(offlineAlert).not.toBeNull();
    expect(offlineAlert?.textContent).toContain('Offline mode');

    app.isOffline.set(false);
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('correctly identifies public and authenticated routes', () => {
    app.currentPath.set('/landing');
    expect(app.isPublicRoute()).toBeTrue();

    app.currentPath.set('/login');
    expect(app.isPublicRoute()).toBeTrue();

    app.currentPath.set('/site-manager');
    expect(app.isPublicRoute()).toBeFalse();
  });

  it('requires the complete Director guide, saves the final preference, and replays from Help', async () => {
    const onboarding = TestBed.inject(OnboardingService);
    spyOn(router, 'navigate').and.resolveTo(true);
    await auth.login('thosontula+director@gmail.com', 'test-password');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(app.showTour()).toBeTrue();
    expect(app.tourStep()).toBe(0);

    const count = app.tourFeatures().length;
    for (let step = 1; step < count; step++) {
      expect(onboarding.isComplete(auth.session()?.userId, 'director')).toBeFalse();
      await app.nextTourStep();
      expect(app.tourStep()).toBe(step);
    }
    expect(app.isLastTourStep()).toBeTrue();
    app.suppressTour.set(true);
    await app.nextTourStep();
    expect(app.showTour()).toBeFalse();
    expect(onboarding.isSuppressed(auth.session()?.userId, 'director')).toBeTrue();

    app.openHelp();
    await app.replayTour();
    expect(app.showHelp()).toBeFalse();
    expect(app.showTour()).toBeTrue();
    expect(app.tourStep()).toBe(0);
  });

  it('navigates to a guide target, scrolls it into view, and removes the highlight', async () => {
    await auth.login('thosontula+director@gmail.com', 'test-password');
    fixture.detectChanges();
    await fixture.whenStable();
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const target = document.createElement('div');
    target.dataset['tour'] = 'director-review-queue';
    const scroll = spyOn(target, 'scrollIntoView');
    document.body.appendChild(target);
    jasmine.clock().install();
    try {
      await app.nextTourStep();
      expect(navigate).toHaveBeenCalledWith(['/director'], { queryParams: {} });
      jasmine.clock().tick(150);
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(target.classList.contains('senatla-tour-target')).toBeTrue();
      jasmine.clock().tick(1400);
      expect(target.classList.contains('senatla-tour-target')).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
      target.remove();
    }
  });

  it('blocks duplicate sign-out and routes to landing after completion', async () => {
    let finish!: () => void;
    const logout = spyOn(auth, 'logout').and.returnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const pending = app.logout();
    expect(app.isSigningOut()).toBeTrue();
    await app.logout();
    expect(logout).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    expect(app.isSigningOut()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith('/landing');
  });

  it('ends a stalled sign-out after ten seconds and shows retry guidance', async () => {
    jasmine.clock().install();
    try {
      spyOn(auth, 'logout').and.returnValue(new Promise<void>(() => undefined));
      const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
      const pending = app.logout();
      jasmine.clock().tick(10001);
      await pending;
      expect(app.isSigningOut()).toBeFalse();
      expect(app.signOutError()).toContain('try again');
      expect(navigate).toHaveBeenCalledWith('/landing');
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
