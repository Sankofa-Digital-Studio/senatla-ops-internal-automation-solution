# Production Candidate Checklist

- [ ] Public Senatla Trading website remains unchanged
- [ ] `npm run verify` passes with lint, typecheck, headless test and build evidence
- [ ] Local Supabase reset and pgTAP contracts pass
- [ ] Desktop and 390 px browser evidence is attached
- [ ] All displayed executive metrics reconcile to records
- [ ] Review bypass is disabled and no service-role key is client-visible
- [ ] Backup and restore rehearsal is recorded
- [ ] Rollback procedure is executable
- [ ] Engineering, Operations and Finance acceptance is signed
- [ ] Handbook version and release notes are updated
- [ ] Email/password-only sign-in and the `@senatlatrading.com` provisioning boundary are verified
- [ ] The exact developer override is verified and a Gmail plus alias is denied override elevation
- [ ] Temporary-password replacement is verified before workspace navigation
- [ ] Operational issue history migration and role-scoped event reads pass pgTAP/CI
- [ ] The commit-specific immutable dev APK prerelease contains `senatla-ops-dev.apk`
- [ ] `/api/download-apk` resolves the newest published dev APK or an explicit fallback
