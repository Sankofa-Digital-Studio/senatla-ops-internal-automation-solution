# OCR-3 Signed-Device UAT Gate

**Status:** Gate implemented; physical-device execution pending.  
**Target:** Senatla remote development project `btdavpeyxtirtshovjdu` at an exact 40-character application commit.  
**Scope:** This extends the existing Senatla Ops asset-registration flow. It does not create a replacement application or a local-data workflow.

> Release rule: OCR is not store-ready until five real role/access variants complete all 25 required results on one signed Android build and one signed iOS build. A failed, blocked, missing, duplicated, unknown, or structurally unsafe result fails the gate.

## Privacy boundary

UAT participants are real users, but the committed record contains aliases only. Credentials, email addresses, identity numbers, access tokens, raw OCR text, native file URIs, private device paths, device serials, UDIDs, IMEIs, and service keys are prohibited. Screenshots and detailed logs remain in the controlled evidence system outside Git; the JSON record contains safe relative evidence references only.

The private machine-readable record belongs under ignored `output/uat-private/ocr-device-uat.json`. Controlled credentials remain in the existing ignored credential handoff or an approved vault and must never be copied into the UAT JSON, this guide, Git, or the journey DOCX.

## Five-user access matrix

| Variant | Application role | Organisation/site relationship | Required proof |
|---|---|---|---|
| `site_owner` | `site` | Same organisation; owning site | Native device flows and permitted creation |
| `site_peer` | `site` | Same organisation; different site | Cross-site denial |
| `office` | `office` | Same organisation | Review, immutable evidence and redacted audit |
| `director` | `director` | Same organisation | Authorised review without mutation bypass |
| `cross_org` | `site` | Different organisation | Cross-organisation denial |

Each variant appears exactly once. The peer must use a different site alias; Office and Director share the owner's organisation alias; the cross-organisation user must not.

## Required results

The `site_owner` executes these nine scenarios on both Android and iOS: permission allow, permission deny, capture cancel, native capture, process-interruption cleanup, low-light review, rotated review, human apply gate, and upload rollback.

The backend/access matrix contains seven additional results: owner create, peer denied, Office review, Director review, cross-organisation denied, ready-evidence immutability, and audit-log redaction. Together these produce 25 required results.

## Execution procedure

1. Record the exact deployed 40-character commit and confirm the runtime targets the approved remote-dev project.
2. Install signed builds on one physical Android device and one physical iOS device. Do not record hardware serial identifiers.
3. Confirm the five real users have the intended role, organisation and site relationships through the authoritative remote database. Hand credentials to participants only through the controlled channel.
4. Execute each scenario. A human must review OCR suggestions before applying them; detected text must never silently become authoritative asset data.
5. Store screenshots and detailed logs in the controlled evidence system. Put only a safe relative reference in each JSON result.
6. Save the private JSON under `output/uat-private/` and validate it:

```powershell
npm run validate:ocr-device-uat -- output/uat-private/ocr-device-uat.json
```

For an explicitly in-progress record only, add `--allow-incomplete`. This can validate structure but can never make `releaseReady` true while any result is failed or blocked.

## Stop rules

Stop the run and treat it as failed if evidence escapes private storage; cleanup leaves a recoverable native artifact; permissions are bypassed; cancellation silently falls back; a role/site/organisation denial fails; OCR applies without human confirmation; upload rollback leaves a pending row/object; ready evidence changes; audit output contains raw OCR or private paths; or the deployed commit/device build cannot be proven.

## Validator contract

The validator is the canonical executable specification. It requires an ordered run window, UUID run ID, exact target project, exact commit, five unique aliases, the access relationships above, exactly one signed Android device and one signed iOS device, and exactly one result for every approved case/platform pair. Extra cases and extra device platforms are rejected.

It logs summary counts and validation issues only; it does not print the submitted payload. The release gate test uses synthetic in-memory fixtures solely to test the validator and never represents completed UAT.

## Acceptance

Release readiness requires all 25 outcomes to be `pass`, zero structural/privacy issues, signed Android and iOS device evidence, five real access variants, and safe evidence references. Until that happens, OCR-3 is an implemented gate with physical UAT pending—not a completed device certification.