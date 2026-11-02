import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
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
});
