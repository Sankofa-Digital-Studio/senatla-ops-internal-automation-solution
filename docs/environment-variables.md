# Environment Variables

Senatla Ops keeps browser configuration separate from privileged server configuration. Never place a Supabase service-role key, provisioning webhook token, or temporary password in `src/`, `public/`, runtime configuration, CI logs, or committed manifests.

## Browser runtime

| Variable | Required | Purpose |
|---|---:|---|
| `SENATLA_API_MODE` | Yes | Use `supabase` for hosted environments and `local` only for controlled local review. |
| `SENATLA_SUPABASE_URL` | Hosted | Supabase project URL. Server code and runtime-config generation consume it. |
| `SENATLA_SUPABASE_ANON_KEY` | Hosted | Publishable browser key. This is not the service-role key. |
| `SENATLA_API_BASE_URL` | No | Optional API origin when serverless APIs are hosted separately. |

## Server-only provisioning

| Variable | Required | Purpose |
|---|---:|---|
| `SENATLA_SUPABASE_URL` | Yes | Supabase project URL used by the Admin Auth client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged server credential used to create and roll back Auth users. Never expose it to the browser. |
| `SENATLA_PROVISIONING_EMAIL_WEBHOOK_URL` | Yes | HTTPS endpoint that accepts the temporary-password delivery payload. Provisioning fails and rolls back when delivery fails. |
| `SENATLA_PROVISIONING_EMAIL_WEBHOOK_TOKEN` | No | Bearer token sent to the email webhook. Recommended for every non-local deployment. |
| `SENATLA_APP_URL` | Yes | Sign-in URL included in the temporary-password email. `SENATLA_PUBLIC_APP_URL` is accepted as a fallback. |

The email webhook receives this server-to-server payload:

```json
{
  "template": "senatla-temporary-password",
  "recipient": {
    "email": "employee@senatlatrading.com",
    "displayName": "Employee Name"
  },
  "temporaryPassword": "generated temporary password",
  "signInUrl": "https://ops.example/login",
  "forcePasswordChange": true
}
```

The webhook must not log the password and should send it only to the requested recipient.

## Provision users from a manifest

Create the manifest in an ignored temporary directory, restrict access to the file, and securely remove it after provisioning. The manifest format is:

```json
{
  "users": [
    {
      "email": "employee@senatlatrading.com",
      "displayName": "Employee Name",
      "role": "site",
      "tempPassword": "generated 12+ character password",
      "organizationId": "00000000-0000-4000-8000-000000000001",
      "siteIds": ["10000000-0000-4000-8000-000000000001"]
    }
  ]
}
```

Then run:

```powershell
npm run provision:users -- tmp\provisioning\users.json
```

Allowed roles are `site`, `office`, and `director`. Site users require at least one site ID. Email addresses must use `@senatlatrading.com`, except the authorised `thosontula@gmail.com` mailbox and its plus-address aliases. Temporary passwords require at least 12 characters with uppercase, lowercase, numeric, and symbol characters.

The script creates a confirmed Auth user with `app_metadata.must_change_password = true`, creates the profile and site access, then sends the temporary password. Any profile, site-access, or email-delivery failure deletes the newly created Auth user before the command exits with an error.
