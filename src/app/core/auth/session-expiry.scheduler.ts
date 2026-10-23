import { InjectionToken, NgZone, inject } from '@angular/core';

export interface SessionExpiryScheduler {
  schedule(callback: () => void, delayMs: number): () => void;
}

export const SESSION_EXPIRY_SCHEDULER = new InjectionToken<SessionExpiryScheduler>('SESSION_EXPIRY_SCHEDULER', {
  providedIn: 'root',
  factory: () => {
    const zone = inject(NgZone);
    return {
      schedule(callback, delayMs) {
        let timer!: ReturnType<typeof setTimeout>;
        zone.runOutsideAngular(() => {
          timer = setTimeout(() => zone.run(callback), delayMs);
        });
        return () => clearTimeout(timer);
      },
    };
  },
});
