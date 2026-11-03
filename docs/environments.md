# Environment Boundaries

| Environment | Data | Authentication | Purpose |
|---|---|---|---|
| Local | Deterministic synthetic records | Local Supabase email/password accounts | Development and repeatable validation |
| Preview | Synthetic or approved test records | Supabase preview project | Pull-request browser and UAT evidence |
| Production | Senatla Trading operational records | Production Supabase | Authorized internal operations |

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never appear in Angular runtime configuration. Authentication never has a local review bypass; every environment uses Supabase Auth. Runtime configuration and `.env` files are ignored by Git; `.env.example` documents names only.

Production promotion requires a reviewed migration, clean reset evidence, backup reference, rollback instructions and signed release checklist.
