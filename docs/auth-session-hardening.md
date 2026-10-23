# Session expiry and user-interface boundary

## Purpose

Senatla Ops must not leave a person's name or protected workspace visible after the application session has expired. The browser applies a ten-minute maximum session window and redirects a protected route to login once that limit is reached.

## What the application enforces

- A newly created local-review or Supabase-backed application session expires no later than ten minutes after sign-in.
- An earlier upstream expiry always wins.
- At expiry, the application clears its session state, calls the configured auth gateway's sign-out path, removes the local-review session storage record, and redirects protected routes to login.
- The public landing, registration, and login routes never render the signed-in utility header or display name.
- The app checks expiry on its timer, when the browser becomes visible, and when a route guard evaluates access. These three checks mitigate background-tab timer throttling.

## Required Supabase dashboard action

Client code cannot revoke an already-issued JWT at the authentication server by itself. A project administrator must configure Supabase Auth session controls to match this ten-minute policy:

1. Open the Supabase project dashboard.
2. Go to **Authentication** and open the session controls for the project.
3. Set the maximum session lifetime (time-boxed session) and inactivity timeout to **10 minutes**, where the current project plan exposes those controls.
4. Set the JWT expiry at or below the same window, but not below Supabase's documented five-minute minimum recommendation.
5. Save the changes, then sign in with a non-production account and verify that a protected route requires a fresh login after ten minutes.

## Verification

- `npm run typecheck` verifies application and spec TypeScript compilation.
- `npm run test:ci` runs unit tests, including `session-policy.spec.ts`.
- `npm run test:e2e:cypress` runs the public landing navigation test while the application is available on port 4200.

## Do not weaken this boundary

Do not extend expiry in the browser on token refresh, do not restore expired session storage records, and do not make the display name depend solely on a persisted browser value. Any request to lengthen the session must change this document, the server configuration, unit tests, and the security review together.