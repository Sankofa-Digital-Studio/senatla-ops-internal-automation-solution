# UAT auth and APK upgrade contract

## Browser auth

- Registration remains disabled until required identity, email, password and optional invitation fields are valid.
- Password guidance is visible before submit.
- Registration, login, invitation redemption and recovery must always resolve to an explicit success or actionable error state.
- Supabase authentication errors are mapped to user-safe messages; raw backend errors are not exposed.

## Android UAT upgrades

Published `dev` APKs must be upgradeable in place on tester devices.

- Application ID remains `za.co.senatlatrading.ops`.
- `versionCode` is injected from the native workflow run number and therefore increases between published builds.
- Published dev APKs must use one persistent UAT signing identity.
- Pull-request debug builds may use the runner debug identity because they are not published for device upgrade testing.

### Required GitHub Actions secrets

- `SENATLA_UAT_KEYSTORE_B64` — base64-encoded JKS/PKCS12 keystore bytes.
- `SENATLA_UAT_STORE_PASSWORD`
- `SENATLA_UAT_KEY_ALIAS`
- `SENATLA_UAT_KEY_PASSWORD`

The dev publication job fails closed if any signing secret is missing. Never commit the keystore or passwords to the repository.

## Existing tester installations

An APK already installed with a different certificate cannot be upgraded by a newly stabilized signing identity. Testers must uninstall that legacy build once (including other Android users/PrivateSpace where applicable), install the first stable-signed dev APK, and should then be able to upgrade future dev APKs in place.
