# Hosted deployment records

Use the `Senatla Ops hosted deployment smoke` workflow to produce evidence for an exact Vercel deployment. The workflow verifies public runtime mode, reviewed commit identity, unauthenticated route protection, authenticated Office access, and desktop/mobile viewport containment.

An approved record contains only:

- deployment URL and environment;
- exact reviewed commit;
- rollback commit;
- responsible owner;
- verification result and UTC timestamp.

Do not store QA passwords, Vercel bypass tokens, Supabase keys, personal information, screenshots containing client records, or copied runtime configuration in this directory.

Issue #88 was verified on UAT preview using Vercel automation bypass and closed on GitHub with full preflight and smoke verification evidence.
