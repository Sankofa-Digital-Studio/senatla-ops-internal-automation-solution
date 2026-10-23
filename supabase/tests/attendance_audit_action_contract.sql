begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select ok(
  pg_get_constraintdef(oid) like '%site_readiness_confirmed%',
  'attendance audit constraint preserves readiness evidence'
)
from pg_constraint
where conrelid = 'public.attendance_audit_events'::regclass
  and conname = 'attendance_audit_events_action_check';

select ok(
  pg_get_constraintdef(oid) like '%queue_delivery_accepted%',
  'attendance audit constraint permits accepted queue evidence'
)
from pg_constraint
where conrelid = 'public.attendance_audit_events'::regclass
  and conname = 'attendance_audit_events_action_check';

select ok(
  pg_get_constraintdef(oid) like '%queue_delivery_rejected%',
  'attendance audit constraint permits rejected queue evidence'
)
from pg_constraint
where conrelid = 'public.attendance_audit_events'::regclass
  and conname = 'attendance_audit_events_action_check';

select ok(
  pg_get_constraintdef(oid) like '%queue_delivery_retryable%',
  'attendance audit constraint permits retryable queue evidence'
)
from pg_constraint
where conrelid = 'public.attendance_audit_events'::regclass
  and conname = 'attendance_audit_events_action_check';

select ok(
  pg_get_constraintdef(oid) like '%queue_delivery_retried%',
  'attendance audit constraint permits retried queue evidence'
)
from pg_constraint
where conrelid = 'public.attendance_audit_events'::regclass
  and conname = 'attendance_audit_events_action_check';

select * from finish();
rollback;
