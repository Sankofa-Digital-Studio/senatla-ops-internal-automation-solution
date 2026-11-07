# Director Workspace Guidance

## Purpose

The director workspace opens with a guided walkthrough after sign-in. Every director sees oversight, detail review, help, and safe sign-out. The two authorised developer Directors also see employee and site management, assets, and OCR steps.

## Guided walkthrough

The walkthrough is mandatory on first entry. Each step can navigate the director to the relevant route and scroll the target into view. The final step includes a **Don't show this guide again** checkbox. The Help dialog can replay the guide at any time.

## Director capabilities

- Review cross-site operating status, costs, risks, attendance, invoices, and decision queues.
- Open source-backed operational records behind executive summaries.
- Review common issues and recovery steps from the shared Help control.

## Developer Director administration

Only the exact `thosontula@gmail.com` and `thosontula+tag@gmail.com` accounts, while active Directors, receive the shared Office Admin management access. Ordinary Directors retain oversight and their existing review responsibilities.

- Manage employees and employment status.
- Assign employees to sites through the reviewed assignment workflow.
- Maintain sites and organization assets.
- Use asset OCR to capture evidence, review extracted fields, correct values, and verify before saving.

## Help and troubleshooting

### The page is still loading

Check the network connection and try again. If a reference code is shown, share it with support.

### A person or site is missing

If you have management access, open the shared administration workspace and review the active filters in People or Sites. Otherwise, contact your Office Admin.

### OCR read a value incorrectly

Compare every extracted value with the source document. Correct the value and verify the evidence before saving.

### Sign out is taking too long

Wait for the sign-out request to finish. If the retry message appears, try again or close the message and contact support with any reference code.

## Acceptance criteria

- First successful director sign-in opens the complete guide before normal use.
- No step is skipped accidentally.
- Suppression works per user and role.
- Help is accessible from the authenticated header.
- Tour targets are visible on desktop and mobile layouts.
- Auth errors are visible without developer tools.
- Sign-out never leaves a permanent frozen loader.
- Only the two named developer Directors can administer; their actions remain audited and organization-scoped.
