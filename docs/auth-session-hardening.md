# Authentication, session expiry and user-interface boundary

## Purpose

Senatla Ops must not leave a person's name or protected workspace visible after the application session has expired. The browser applies a 2-hour-and-30-minute (150-minute / 9,000,000 ms) inactivity session window and redirects a protected route to login once that limit of user inactivity is reached.

## Identity and provisioning boundary

- The only interactive sign-in method is email and password. Google authentication and self-registration are removed.
- Standard accounts are provisioned server-side and must end in `@senatlatrading.com`.
- `thosontula@gmail.com` is the exact, case-normalized developer override. Gmail plus aliases are not equivalent for privilege checks.
- Provisioning sends a generated temporary password and sets `app_metadata.must_change_password = true`.
- The first authenticated journey forces password replacement before workspace routing. Recovery PIN registration is handled separately and never substitutes for the temporary password.
- Office Administrators have less authority than Directors. Director creation requires approval by an existing Director or the exact developer override.
- Profile recovery uses immutable profile history and an audited rollback operation; applied history is never edited in place.

## What the application enforces

- A newly created local-review or Supabase-backed application session expires after 2 hours and 30 minutes of inactivity.
- User activity (clicks, keypresses, touches, scrolls) refreshes the inactivity timer and extends the active session window.
- An earlier upstream expiry always wins.
- At expiry (after 2 hours and 30 minutes of inactivity), the application clears its session state, calls the configured auth gateway's sign-out path, removes the local-review session storage record, and redirects protected routes to login.
- The public landing, registration, and login routes never render the signed-in utility header or display name.
- The app checks expiry on its timer, when the browser becomes visible, and when a route guard evaluates access. These three checks mitigate background-tab timer throttling.

## Required Supabase dashboard action

Client code cannot revoke an already-issued JWT at the authentication server by itself. A project administrator must configure Supabase Auth session controls to match this 2-hour-and-30-minute policy:

1. Open the Supabase project dashboard.
2. Go to **Authentication** and open the session controls for the project.
3. Set the maximum session lifetime (time-boxed session) and inactivity timeout to **2 hours and 30 minutes** (9000 seconds), matching `supabase/config.toml` (`jwt_expiry = 9000`).
4. Set the JWT expiry at or below the same window.
5. Save the changes, then sign in with a non-production account and verify that an inactive protected route requires a fresh login after 2 hours and 30 minutes.

## Verification

- `npm run typecheck` verifies application and spec TypeScript compilation.
- `npm run test:ci` runs unit tests, including `session-policy.spec.ts`.
- `npm run test:e2e:cypress` runs the public landing navigation test while the application is available on port 4200.

## Do not weaken this boundary

Do not restore expired session storage records, and do not make the display name depend solely on a persisted browser value. Any request to lengthen or shorten the session must change this document, the server configuration, unit tests, and the security review together.
