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
    component.username = 'director.exec@test.invalid';
    component.password = 'test-password';

    await component.handleLogin();

    expect(component.errorMsg).toBe('Invalid credentials for the selected role.');
  });

  it('uses the production login hint', () => {
    expect(component.modeHint).toContain('Secure access portal');
  });

  it('requests a password reset for a known demo account', async () => {
    component.username = 'office.admin@test.invalid';

    await component.requestPasswordReset();

    expect(component.recoveryMsg).toContain('Mock reset prepared');
    expect(component.recoveryMsg).toContain('/login/recovery?mock_user=office.admin%40test.invalid');
  });

  it('updates a password during local recovery mode', async () => {
    component.username = 'office.admin@test.invalid';
    await component.requestPasswordReset();
    component.recoveryMode = true;
    component.recoveryUsernameHint = 'office.admin@test.invalid';
    component.recoveryPassword = 'new-password';
    component.confirmRecoveryPassword = 'new-password';

    await component.handlePasswordUpdate();
    component.password = 'new-password';
    await component.handleLogin();

    expect(component.errorMsg).toBe('');
  });

  it('signs in immediately with one-click demo role login', async () => {
    await component.loginAsDemoRole('site');
    expect(component.auth.isAuthenticated()).toBeTrue();
    expect(component.auth.role()).toBe('site');
  });

  it('triggers first-login operational role picker on Google Sign-In for new user', async () => {
    await component.handleGoogleSignIn('director.exec@senatlatrading.com');
    expect(component.showRolePicker).toBeTrue();
    expect(component.pendingProfile?.email).toBe('director.exec@senatlatrading.com');

    component.selectOperationalRole('office');
    await component.confirmOperationalRole();

    expect(component.showRolePicker).toBeFalse();
    expect(component.auth.isAuthenticated()).toBeTrue();
    expect(component.auth.role()).toBe('office');
  });
});
