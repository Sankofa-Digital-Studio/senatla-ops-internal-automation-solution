# Vendor workflow boundary

## Outcome

The first bounded modularization slice moves vendor rules, row/payload mapping, balances and invoice state into one VendorWorkspace module. OfficeAdminService retains authentication, database calls, local persistence, approval orchestration and audit ordering. Existing public vendor signals alias the same state; there is no second cache or new injected service.

The vendor form also had a confirmed contract defect: it did not send the required internalOrderNumber. Its existing purchase-order field now explicitly represents the internal PO, and a separate supplier order reference supports invoice-less submissions. Supplier and internal references remain distinct in the registry. Concurrent clicks are guarded, and failed saves retain entered fields.

## Three-pass review

1. Dependency inspection found that vendor approval execution and fuel procurement also use this state. Moving the UI alone would leave the coupling intact.
2. Contract review found the missing internal PO and identified the existing supplier-order-over-invoice reference precedence. The extraction preserves that precedence and the database payload fields.
3. Failure review rejected combining lazy loading, transaction changes and state extraction in this slice. A failed database insert must leave state and approvals untouched. Successful submission keeps persistence, approval and audit order. Approval replacement must not increase the balance a second time.

## Validation

Focused cases cover normalization and reference alternatives, row/payload round trips, creation-date preservation, balances, approval replacement, database rejection, successful command orchestration, form payloads, retained form values and concurrent clicks. The integration gate is the existing application, database, responsive and native CI suite.

## Limits and next work

The broad workspace loader still makes 26 parallel reads, including two vendor reads. This is a source-level request baseline, not a measured runtime improvement. This slice does not claim faster loading. Next, capture real request counts, bytes and ready time, then isolate feature loading/retry without replacing valid unrelated data on failure.

Invoice persistence and approval creation remain separate operations. A later approval failure can leave a saved invoice. Retry/idempotency repair needs a separate persistence contract and fault-injection tests; it must not be hidden inside a mechanical extraction. The existing writable signal aliases are temporary compatibility points, including director test fixtures, and can become read-only after their consumers migrate.
