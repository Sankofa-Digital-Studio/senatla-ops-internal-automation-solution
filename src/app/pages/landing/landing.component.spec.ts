import { ComponentFixture, TestBed } from '@angular/core/testing';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(() => {
    resetTestStorage();
    TestBed.configureTestingModule({ imports: [LandingComponent], providers: TEST_APP_PROVIDERS });
    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('keeps operational role names off the public hero', () => {
    const hero = (fixture.nativeElement as HTMLElement).querySelector('.hero-copy') as HTMLElement;
    const text = hero.textContent?.toLowerCase() || '';
    expect(text).not.toContain('site manager');
    expect(text).not.toContain('office admin');
    expect(text).not.toContain('director');
  });

  it('keeps one semantic page heading and a non-interactive preparation status', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.hero-copy h1')?.textContent).toContain('Command every moving part');
    const loader = page.querySelector('.cornerstone-loader') as HTMLElement;
    expect(loader.getAttribute('role')).toBe('status');
    expect(loader.querySelector('button, a')).toBeNull();
  });

  it('provides distinct in-page destinations for capabilities and assurance', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('a[href="#capabilities"]')).not.toBeNull();
    expect(page.querySelector('a[href="#assurance"]')).not.toBeNull();
    expect(page.querySelector('#capabilities')).not.toBeNull();
    expect(page.querySelector('#assurance')).not.toBeNull();
  });

  it('links both navigation menus to the stable current-dev APK resolver', () => {
    const page = fixture.nativeElement as HTMLElement;
    const href = '/api/download-apk';
    expect(page.querySelectorAll('a[href="' + href + '"]').length).toBe(2);
  });

  it('keeps test credentials in a modal opened from either nav menu', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="dialog"]')).toBeNull();
    expect(page.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);

    (page.querySelector('.desktop-menu button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const dialog = page.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('responsive.site@senatlatrading.com');
    expect(dialog.textContent).toContain('responsive.office@senatlatrading.com');
    expect(dialog.textContent).toContain('responsive.director@senatlatrading.com');
    expect(dialog.textContent).toContain('thosontula@gmail.com');
    expect(dialog.textContent).toContain('thosontula+tag@gmail.com');
    expect(dialog.textContent).not.toContain('thosontula+site@gmail.com');
    expect(dialog.textContent).toContain('Shared UAT password');
    expect(dialog.textContent).not.toContain('test-password');
  });

  it('closes test credentials modal on Escape key press with accessible dialog handling', () => {
    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.desktop-menu button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const dialog = page.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(page.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the cornerstone welcome gate while the landing page is preparing', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.cornerstone-loader')).not.toBeNull();
    expect(page.textContent).toContain('Senatla means a rock');
  });

  it('renders sign-in as an accessible icon-only button and nests chevron within hero fold', () => {
    const page = fixture.nativeElement as HTMLElement;
    const navLogin = page.querySelector('.desktop-menu .nav-login') as HTMLElement;
    expect(navLogin).not.toBeNull();
    expect(navLogin.getAttribute('aria-label')).toBe('Sign In');
    expect(navLogin.querySelector('svg.nav-login-icon')).not.toBeNull();
    expect(navLogin.querySelector('.sr-only')?.textContent).toContain('Sign In');
    expect(navLogin.querySelector('.nav-login-text')).toBeNull();

    const heroFold = page.querySelector('.hero-fold') as HTMLElement;
    expect(heroFold).not.toBeNull();
    expect(heroFold.querySelector('.scroll-down-wrap')).not.toBeNull();
  });

  it('offers login without exposing public registration', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).not.toContain('/register');
    expect(links).toContain('/login');
  });
});
