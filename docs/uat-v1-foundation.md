# Senatla Ops UAT v1 Foundation

## Scope
Foundation-only UAT changes: runtime-config routing before SPA fallback; routing regression coverage; removal of visible payroll/wage-derived Director metrics while retaining attendance and timesheets.

## Safety boundary
No Gmail, account provisioning, production, invoices, or real workforce data changes are part of this UAT bundle.

## Verification
Targeted runtime-config tests are included in `npm run verify`. Full local execution and Vercel preview verification must be evidenced before merge.
