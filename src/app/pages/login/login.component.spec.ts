import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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

  it('requests a password reset for a known demo account', async () => {
    component.username = 'thosontula+office@gmail.com';

    await component.requestPasswordReset();

    expect(component.recoveryMsg).toContain('Mock reset prepared');
    expect(component.recoveryMsg).toContain('/login/recovery?mock_user=thosontula%2Boffice%40gmail.com');
  });

  it('updates a password during local recovery mode', async () => {
    component.username = 'thosontula+office@gmail.com';
    await component.requestPasswordReset();
    component.recoveryMode = true;
    component.recoveryUsernameHint = 'thosontula+office@gmail.com';
    component.recoveryPassword = 'new-password';
    component.confirmRecoveryPassword = 'new-password';

    await component.handlePasswordUpdate();
    component.password = 'new-password';
    await component.handleLogin();

    expect(component.errorMsg).toBe('');
  });

  it('renders only email and password authentication controls', () => {
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
