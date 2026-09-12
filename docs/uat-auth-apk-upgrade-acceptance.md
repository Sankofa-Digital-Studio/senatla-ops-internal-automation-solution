# UAT acceptance checklist

## Browser registration and login

- Register stays disabled until required fields are valid.
- Password guidance updates before submit.
- Registration success and failure are visible and announced.
- Login validation blocks malformed email / empty password.
- Supabase login, registration and recovery failures map to actionable, user-safe messages.

## Android dev APK

- Application ID remains stable.
- Published dev APK versionCode increases on every native workflow run.
- Published dev APK uses the persistent UAT signing identity from GitHub Actions secrets.
- Dev publication fails closed if signing material is absent.
- After the one-time uninstall of any legacy differently signed build, APK N installs and APK N+1 upgrades in place without uninstalling.
