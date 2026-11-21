# Security Policy

## Supported Versions

We actively maintain and provide security updates for the current release series:

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5.0 | :x:                |

## Reporting a Vulnerability

The Senatla Ops team takes the security of our platform and confidential enterprise operations seriously.

If you discover a security vulnerability or privilege escalation issue:

1. **Do not create a public GitHub issue.**
2. Send an email to [security@sankofadigital.co.za](mailto:security@sankofadigital.co.za) or directly contact the lead engineer at [thosontula@gmail.com](mailto:thosontula@gmail.com).
3. Include the following details:
   - Description of the vulnerability.
   - Exact steps or script to reproduce the behavior.
   - Impact assessment (e.g. data exposure, RLS policy bypass, role escalation).
   - Any suggested remediations or patches.

### Response Timelines

- **Initial Acknowledgement:** Within 24 hours.
- **Triage & Severity Assessment:** Within 48 hours.
- **Fix Delivery & Mitigation:** Critical vulnerabilities are hotfixed within 72 hours with coordinated release deployment.

## Security Practices & Boundaries

- All database access is governed by strict PostgreSQL Row Level Security (RLS) policies.
- Service-role credentials and private keys are never committed or exposed to client-side bundles.
- File evidence is encrypted, access-token controlled, and isolated by organization scope.
