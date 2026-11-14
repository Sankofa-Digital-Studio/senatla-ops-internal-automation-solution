# Senatla Ops v0.5.8

## Summary

This release improves device-first OCR capture and makes the browser fallback explicit for Android, iPhone, and mobile-browser users.

## User-facing changes

- Mobile document inputs request the rear camera where supported.
- Android and iPhone users are directed to the device's native scan/camera path for OCR.
- Mobile-browser users are told what to do when browser OCR is unavailable: use the device's scan-text/OCR capability or an approved OCR app, then paste only recognised form fields for review.
- OCR values remain suggestions until a user reviews and confirms them.

## Security and provenance

- Existing private evidence storage, content hashing, OCR engine/confidence metadata, and human-review workflow are unchanged.
- The manual OCR guidance explicitly prohibits pasting secrets or unrelated personal information.
- No new cloud OCR dependency is introduced by this release.

## Verification

- `npm run typecheck`: passed.
- `npm run test:ocr-device-uat-contract`: passed, 6/6 tests.
- Hosted, native-platform, and production promotion gates remain authoritative for final release approval.

## Rollback

Roll back to the preceding `main` commit or the `v0.5.7` release tag. This release contains no database migration.
