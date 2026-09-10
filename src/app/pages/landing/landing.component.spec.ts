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

  it('provides distinct in-page destinations for capabilities and assurance', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('a[href="#capabilities"]')).not.toBeNull();
    expect(page.querySelector('a[href="#assurance"]')).not.toBeNull();
    expect(page.querySelector('#capabilities')).not.toBeNull();
    expect(page.querySelector('#assurance')).not.toBeNull();
  });

  it('links both navigation menus to the current unsigned dev APK', () => {
    const page = fixture.nativeElement as HTMLElement;
    const href = 'https://github.com/Sankofa-Digital-Studio/senatla-ops/releases/download/dev-latest/senatla-ops-dev.apk';
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
    expect(dialog.textContent).toContain('site.manager@test.invalid');
    expect(dialog.textContent).toContain('office.admin@test.invalid');
    expect(dialog.textContent).toContain('director.exec@test.invalid');
    expect(dialog.textContent).toContain('Shared UAT password');
    expect(dialog.textContent).not.toContain('test-password');
  });

  it('shows the cornerstone welcome gate while the landing page is preparing', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.cornerstone-loader')).not.toBeNull();
    expect(page.textContent).toContain('Senatla means a rock');
  });
  it('offers public registration and login navigation', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).toContain('/register');
    expect(links).toContain('/login');
  });
});
