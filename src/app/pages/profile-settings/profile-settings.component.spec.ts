import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingService } from 'src/app/core/services/onboarding.service';
import { ProfileSettingsComponent } from './profile-settings.component';

describe('ProfileSettingsComponent', () => {
  const initialSession = { userId: 'first', displayName: 'First User' };
  let component: ProfileSettingsComponent;
  let session: ReturnType<typeof signal<typeof initialSession>>;
  let updateDisplayName: jasmine.Spy;

  beforeEach(() => {
    session = signal(initialSession);
    updateDisplayName = jasmine.createSpy('updateDisplayName');
    TestBed.configureTestingModule({
      imports: [ProfileSettingsComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            session,
            role: signal('site'),
            displayName: () => session().displayName,
            updateDisplayName,
          },
        },
        { provide: OnboardingService, useValue: { featuresFor: () => [] } },
      ],
    });
    const fixture = TestBed.createComponent(ProfileSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('saves the draft and displays the persisted name', async () => {
    updateDisplayName.and.callFake(async () => {
      session.set({ ...initialSession, displayName: 'Updated User' });
    });
    component.displayNameDraft = ' Updated User ';

    await component.saveDisplayName();

    expect(updateDisplayName).toHaveBeenCalledOnceWith(' Updated User ');
    expect(component.displayNameDraft).toBe('Updated User');
    expect(component.profileMessage).toBe('Display name updated.');
    expect(component.isSavingDisplayName).toBeFalse();
  });

  it('keeps a failed draft available for retry', async () => {
    updateDisplayName.and.rejectWith(new Error('Save unavailable'));
    component.displayNameDraft = 'Retry User';

    await component.saveDisplayName();

    expect(component.displayNameDraft).toBe('Retry User');
    expect(component.profileError).toBe('Save unavailable');
    expect(component.profileMessage).toBe('');
    expect(component.isSavingDisplayName).toBeFalse();
  });

  it('loads the new display name when the session changes', () => {
    session.set({ userId: 'second', displayName: 'Second User' });
    TestBed.flushEffects();

    expect(component.displayNameDraft).toBe('Second User');
  });
});
