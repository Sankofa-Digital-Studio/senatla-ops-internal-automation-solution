# Workspace loading recovery

## Decision and result

The previous pass established a vendor boundary. This pass addresses an observed reliability defect: any failed workspace read replaced operational data with demo defaults and marked the workspace hydrated. The UI also offered no workspace retry.

Loads remain atomic. A failed refresh retains the previously successful operational snapshot for the same access scope and exposes a stale-data warning with retry. A first-load failure shows unavailable data, not demo records. Account, organization, role and permitted-site changes invalidate the old operational snapshot. Token refresh with unchanged access no longer starts another 26-read load. Explicit retry still reloads. Signed-out state starts no reads, and load sequence checks discard late responses. Known database authorization errors invalidate retained data. Application-wide designation-rate configuration retains its existing behavior.

Office and director views now display the failure and retry action. Snapshot validation and normalization happen before publishing signal values, so an incomplete response cannot update only part of the view.

## Critical review

1. The initial proposal was per-read partial loading. That risks presenting incomplete payroll, approval and report totals as complete.
2. The revised boundary keeps one complete snapshot and makes failed refreshes explicit. The tradeoff is that initial loading still waits for all 26 reads; avoiding duplicate refresh-triggered loads is verified by call counts, but no latency or byte reduction is claimed.
3. Race and access review added scope invalidation, rejection of stale completions, authorization-error handling, malformed-snapshot checks and duplicate-retry prevention. Signal reads inside load execution are untracked so they cannot accidentally become dependencies of the authentication effect.

## Verification

Regression cases cover first failure, refresh failure and recovery, account changes, logout during a request, out-of-order completion, authorization rejection, scope changes, duplicate retries and malformed snapshots. UI cases cover unavailable data, a working retry action and stale-data messaging. The existing application, database, responsive and native CI gates remain the integration gate.

## Remaining work

Measure requests, bytes and ready time before changing fetch policy. Then introduce feature-owned loading with explicit completeness contracts for cross-feature reports. The shared local review cache and global designation configuration are not converted into production per-user storage in this slice. Invoice/approval transactional retry safety remains a separate task.
