import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  beforeEach(waitForAsync(() => {
    resetTestStorage();
    TestBed.configureTestingModule({ imports: [RegisterComponent], providers: TEST_APP_PROVIDERS }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('creates the registration surface', () => expect(component).toBeTruthy());

  it('keeps registration disabled until required fields are valid', () => {
    expect(component.isRegistrationReady).toBeFalse();
    component.displayName = 'New User';
    component.email = 'new.user@example.com';
    component.password = 'a-secure-password';
    component.confirmPassword = 'a-secure-password';
    expect(component.isRegistrationReady).toBeTrue();
  });

  it('requires a complete invitation code when enabled', async () => {
    component.displayName = 'New User'; component.email = 'new.user@example.com';
    component.password = 'a-secure-password'; component.confirmPassword = 'a-secure-password';
    component.showAdminCode = true; component.adminCode = 'short';
    await component.handleRegistration();
    expect(component.message).toBe('Enter the complete invitation code.');
    expect(component.isRegistrationReady).toBeFalse();
  });

  it('creates minimum access without granting admin', async () => {
    component.displayName = 'New User'; component.email = 'new.user@example.com';
    component.password = 'a-secure-password'; component.confirmPassword = 'a-secure-password';
    await component.handleRegistration();
    expect(component.isSuccess).toBeTrue();
    expect(component.message).toContain('minimum access');
  });

  it('explains password progress before submission', () => {
    component.password = 'short';
    expect(component.passwordGuidance).toContain('more character');
    component.password = 'a-secure-password';
    expect(component.passwordGuidance).toContain('requirement met');
  });
});