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

  it('requires a complete invitation code when enabled', async () => {
    component.displayName = 'New User'; component.email = 'new.user@example.com';
    component.password = 'a-secure-password'; component.confirmPassword = 'a-secure-password';
    component.showAdminCode = true; component.adminCode = 'short';
    await component.handleRegistration();
    expect(component.message).toBe('Enter the complete invitation code.');
  });

  it('directs users to an office administrator instead of self-registering', async () => {
    component.displayName = 'New User'; component.email = 'new.user@example.com';
    component.password = 'a-secure-password'; component.confirmPassword = 'a-secure-password';
    await component.handleRegistration();
    expect(component.isSuccess).toBeFalse();
    expect(component.message).toContain('Self-registration is disabled');
    expect(component.message).toContain('office administrator');
  });
});