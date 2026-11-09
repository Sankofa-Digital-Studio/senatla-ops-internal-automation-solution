import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminUsersComponent } from './admin-users.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let component: AdminUsersComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders user invitation form and access directory', () => {
    expect(component).toBeTruthy();
    const h2s = fixture.nativeElement.querySelectorAll('h2');
    const titles = Array.from(h2s).map((h: any) => h.textContent.trim());
    expect(titles).toContain('Invite User');
    expect(titles).toContain('Access Directory');
  });

  it('validates required fields before submitting invite', async () => {
    component.inviteForm = { email: '', displayName: '', role: 'site' };
    await component.submitInvite();
    expect(component.feedback()).toContain('Please provide both email and display name.');
  });
});
