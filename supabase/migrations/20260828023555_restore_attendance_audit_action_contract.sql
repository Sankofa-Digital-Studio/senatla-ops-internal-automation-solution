begin;

alter table public.attendance_audit_events
  drop constraint if exists attendance_audit_events_action_check;

alter table public.attendance_audit_events
  add constraint attendance_audit_events_action_check
  check (action in (
    'attendance_marked_present',
    'attendance_marked_absent',
    'attendance_marked_pending',
    'attendance_reason_updated',
    'attendance_comment_updated',
    'safety_talk_completed',
    'safety_talk_updated',
    'sync_submitted',
    'site_readiness_confirmed',
    'queue_delivery_accepted',
    'queue_delivery_rejected',
    'queue_delivery_retryable',
    'queue_delivery_retried'
  )) not valid;

alter table public.attendance_audit_events
  validate constraint attendance_audit_events_action_check;

commit;
