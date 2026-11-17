# Workshop asset readiness

## Confirmed rules

- A Critical fault or missing mandatory asset information takes the asset out of operation immediately.
- A High fault needs a preliminary workshop inspection. Record whether temporary operation is allowed and when the workshop expects intake. The latest operational cutoff is close of business on the fifth Monday-to-Friday day, counting the inspection weekday as day one. A Monday inspection therefore expires Friday at workshop close. An earlier appointment takes precedence. Weekend days never count. At the cutoff, withdraw the asset from business rotation even when it is still awaiting a workshop bay. Workshop backlog priority can remain High.
- A booking-off record captures the asset, driver or operator, reason, decision, proposed and actual service dates, and whether a replacement was allocated. Link the replacement when provided.
- Only authorised workshop personnel can service assets. Use the Site Manager role with workshop or engineering-workshop scope for the staff register, calendar and booking capacity.
- Head Office Admin, Workshop Admin in their scope, and Director can verify mandatory asset information. A verified licence-only correction may clear that blocker without a job card. Use an asset-specific job card to record servicing, labour, parts and any licensing costs. A zero-value card is valid when there is work to document without a charge.
- Workshop release requires the completed servicing job card, pre- and post-service forms, and sign-off by the workshop head or authorised secondary lead. Keep any remaining blocker visible. A released asset becomes Ready for collection. Workshop staff and the driver or operator both confirm handover before it becomes Active.
- Dedicated driver/operator access and fingerprint confirmation are future work, subject to employee-device capability.

## Implementation boundary

The Asset Register and Director use the existing TypeScript readiness evaluator for their displays. The hosted Site Manager readiness RPC has a separate SQL policy. The workshop workflow needs persisted inspection decisions, workshop close times, appointments and handover evidence before enforcing the deadline. Do not infer an inspection from a legacy work order's due date. Extend the server-side policy and make all hosted operational decisions consume it through the existing readiness service and gateway. Preserve reason codes and the evaluated time for tracing each decision.
