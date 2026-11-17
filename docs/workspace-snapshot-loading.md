# Single-request workspace loading

## Change

Office workspace startup now calls office_workspace_snapshot_v1 once instead of issuing 26 independent REST requests. The SQL function returns the same 26 collections in one statement. It preserves each projection, ordering and limit, including the configured 1000-row REST cap and the smaller audit, approval and queue limits. Existing application row mapping and atomic snapshot recovery remain in place.

This reduces HTTP fan-out, not the number of underlying tables read. The payload retains the operational data needed by existing screens and reports. No latency or payload reduction is assumed before measurement.

## Access and consistency

The function is STABLE, SECURITY INVOKER, uses an empty search path with qualified tables, revokes execution from PUBLIC and anon, and grants authenticated callers execution. Existing table privileges and RLS still decide which rows each caller can see. One SQL statement provides a consistent snapshot across the collections.

Reference: https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker

## Verification and measurement

Loader unit tests enforce one RPC, complete response shape, and no fallback on authorization, timeout or database errors. pgTAP tests verify invoker rights, execution grants, all 26 collections and site-specific asset visibility.

The responsive test setup compares legacy and snapshot reads for office, director and site accounts before browser tests mutate the isolated fixture. It requires equal records and exactly 26 versus 1 HTTP requests, records response-body bytes and data-ready time, and writes output/playwright/workspace-load-benchmark.json. Measurements describe the CI fixture, not production latency. A browser test also verifies that the Office screen hydrates through one snapshot request.

## Rollout and rollback

Apply the new migration after the repository's prerequisite migrations, then deploy the frontend. Only a missing-function error (PGRST202) activates the legacy loader during rollout; other errors retain the explicit recovery behavior. An older database therefore remains compatible, but continues to use the old request count until migrated. Roll back the frontend if necessary; the added read-only function can remain without affecting older clients.

The checkout currently has no linked Supabase project. The connected project named senatla-ops has an older schema (including no issue_events table), so applying this function alone there is not a valid rollout. Confirm the deployment target and reconcile prerequisite migrations before changing that hosted database. No hosted schema changes are made by this implementation.

## Review outcome

Lazy table loading was rejected for this slice because overview, director and cross-feature reports consume most of the collections. It would require new completeness states across multiple screens. A single versioned snapshot resolves the network fan-out while retaining current feature contracts. It does not solve future growth beyond existing row caps; pagination and feature-specific query contracts should follow measured demand.
