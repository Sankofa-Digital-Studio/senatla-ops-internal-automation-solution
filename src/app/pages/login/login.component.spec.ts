import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(waitForAsync(() => {
    resetTestStorage();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: TEST_APP_PROVIDERS,
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rejects a valid account when the selected role is wrong', async () => {
    component.requestedRole = 'office';
    component.username = 'thosontula+director@gmail.com';
    component.password = 'test-password';

    await component.handleLogin();

    expect(component.errorMsg).toBe('Invalid credentials for the selected role.');
  });

  it('uses the production login hint', () => {
    expect(component.modeHint).toBe('Secure access portal · Email and password only');
  });

  it('requests a password reset for a known demo account using recovery PIN flow', async () => {
    component.username = 'thosontula+office@gmail.com';
    component.forgotPin = '4829';

    await component.confirmAndRequestPasswordReset();

    expect(component.recoveryMsg).toContain('Mock reset prepared');
    expect(component.recoveryMsg).toContain('/login/recovery?mock_user=thosontula%2Boffice%40gmail.com');
  });

  it('updates a password during local recovery mode with non-adjacent password and PIN', async () => {
    component.username = 'thosontula+office@gmail.com';
    component.recoveryMode = true;
    component.recoveryUsernameHint = 'thosontula+office@gmail.com';
    component.recoveryPassword = 'theSusp3k_t#';
    component.confirmRecoveryPassword = 'theSusp3k_t#';
    component.recoveryPin = '58291';
    component.onPasswordChange('theSusp3k_t#');

    expect(component.isRecoveryPinHidden).toBeFalse();

    await component.handlePasswordUpdate();
    component.username = 'thosontula+office@gmail.com';
    component.password = 'theSusp3k_t#';
    await component.handleLogin();

    expect(component.errorMsg).toBe('');
  });

  it('routes temporary-password users into the forced password form', async () => {
    component.username = 'thosontula+temporary@gmail.com';
    component.password = 'temporary-password';

    await component.handleLogin();

    expect(TestBed.inject(Router).url).toBe('/login/recovery?forced=1');
    expect(component.auth.requiresPasswordChange()).toBeTrue();
    await TestBed.inject(Router).navigateByUrl('/login');
  });

  it('renders strength meter and hides recovery PIN until password is valid', () => {
    const fix = TestBed.createComponent(LoginComponent);
    const comp = fix.componentInstance;
    comp.recoveryMode = true;
    fix.detectChanges();

    const page = fix.nativeElement as HTMLElement;
    const pwdInput = page.querySelector('#recovery-password') as HTMLInputElement;
    expect(pwdInput).not.toBeNull();
    expect(page.querySelector('#recovery-pin')).toBeNull();

    // Type an invalid password (adjacent constraints)
    comp.onPasswordChange('MYPASSw0RD#');
    fix.detectChanges();

    expect(comp.isRecoveryPinHidden).toBeTrue();
    expect(page.querySelector('#recovery-pin')).toBeNull();

    // Type a valid password (non-adjacent constraints)
    comp.onPasswordChange('theSusp3k_t#');
    fix.detectChanges();

    expect(comp.passwordStrength().acceptable).toBeTrue();
    expect(comp.isRecoveryPinHidden).toBeFalse();
    expect(page.querySelector('#recovery-pin')).not.toBeNull();
  });

  it('disables pasting on confirm password input and shows transient notice', () => {
    component.recoveryMode = true;
    fixture.detectChanges();

    const preventDefaultSpy = jasmine.createSpy('preventDefault');
    component.preventPaste({ preventDefault: preventDefaultSpy } as any);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(component.pastingDisabledNotice()).toBeTrue();
  });

  it('checks PIN availability when 4-5 digits entered and displays verification badge', async () => {
    const fix = TestBed.createComponent(LoginComponent);
    const comp = fix.componentInstance;
    comp.recoveryMode = true;
    comp.onPasswordChange('theSusp3k_t#');
    fix.detectChanges();

    expect(comp.pinChecked()).toBeFalse();

    await comp.onPinChange('4829');
    fix.detectChanges();

    expect(comp.pinChecked()).toBeTrue();
    expect(comp.pinAvailable()).toBeTrue();
    expect(comp.pinMessage()).toContain('available');

    const page = fix.nativeElement as HTMLElement;
    expect(page.textContent).toContain('PIN is new and available');
  });

  it('renders instructions on distinct separate lines in forced recovery mode', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login/recovery?forced=1');
    const fix = TestBed.createComponent(LoginComponent);
    fix.detectChanges();
    await fix.whenStable();
    fix.detectChanges();

    const page = fix.nativeElement as HTMLElement;
    const paragraphs = page.querySelectorAll('.recovery-instructions p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0].textContent).toContain('temporary password must be replaced');
    expect(paragraphs[1].textContent).toContain('save your personal recovery PIN');
    await router.navigateByUrl('/login');
  });

  it('renders only email and password authentication controls on primary form', () => {
    const page = fixture.nativeElement as HTMLElement;
    const links = Array.from(page.querySelectorAll('a')).map((link) => link.getAttribute('href'));

    expect(page.querySelector('input[type="email"]')).not.toBeNull();
    expect(page.querySelector('input[type="password"]')).not.toBeNull();
    expect(page.textContent).not.toContain('Google');
    expect(page.textContent).not.toContain('One-Click Demo');
    expect(page.textContent).not.toContain('Choose Your Operational Role');
    expect(links).not.toContain('/register');
  });
});
