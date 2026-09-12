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

  it('keeps sign-in disabled until email and password are present', () => {
    expect(component.isLoginReady).toBeFalse();
    component.username = 'office.admin@test.invalid';
    component.password = 'test-password';
    expect(component.isLoginReady).toBeTrue();
  });

  it('rejects a valid account when the selected role is wrong', async () => {
    component.requestedRole = 'office';
    component.username = 'director.exec@test.invalid';
    component.password = 'test-password';

    await component.handleLogin();

    expect(component.errorMsg).toBe('Sign-in failed. Check the email, password, and selected role.');
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
});