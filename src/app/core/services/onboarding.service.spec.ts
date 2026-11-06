import { TestBed } from '@angular/core/testing';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService Director preference', () => {
  let onboarding: OnboardingService;

  beforeEach(() => {
    localStorage.clear();
    onboarding = TestBed.inject(OnboardingService);
  });

  it('reopens after completion unless the final checkbox was selected', () => {
    expect(onboarding.shouldAutoOpen('director-1', 'director')).toBeTrue();
    onboarding.complete('director-1', 'director');
    expect(onboarding.isComplete('director-1', 'director')).toBeTrue();
    expect(onboarding.shouldAutoOpen('director-1', 'director')).toBeTrue();

    onboarding.complete('director-1', 'director', true);
    expect(onboarding.shouldAutoOpen('director-1', 'director')).toBeFalse();

    onboarding.reset('director-1', 'director');
    expect(onboarding.shouldAutoOpen('director-1', 'director')).toBeTrue();
  });

  it('keeps preferences separate by user and role', () => {
    onboarding.complete('director-1', 'director', true);
    expect(onboarding.shouldAutoOpen('director-2', 'director')).toBeTrue();
    expect(onboarding.shouldAutoOpen('director-1', 'office')).toBeTrue();
  });
});
