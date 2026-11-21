-- Preserve the existing projections, ordering and per-table REST row caps.
-- One statement gives callers one consistent snapshot under their existing RLS policies.
create or replace function public.office_workspace_snapshot_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'profiles', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, username, display_name, role, is_active, created_at
      from public.profiles
      order by created_at desc
      limit 1000
    ) workspace_rows),
    'sites', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, name, location, manager_profile_id, team_name, job_number, estimated_duration, compliance_checklist, is_active
      from public.sites
      order by name asc
      limit 1000
    ) workspace_rows),
    'employee_groups', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, name, is_active
      from public.employee_groups
      order by name asc
      limit 1000
    ) workspace_rows),
    'employees', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, first_name, surname, id_number, company_number, role, designation, site_id, group_id, employment_status, start_date, basic_rate, pay_rate_unit, safety_qualifications, additional_fields, salary_advances, financials, logs, adjustments, tax_ref_number
      from public.employees
      order by surname asc
      limit 1000
    ) workspace_rows),
    'employee_onboarding_records', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, employee_id, criminal_check_status, fingerprint_check_status, medical_status, red_ticket_number, red_ticket_issued_at, red_ticket_expires_at, notes, updated_at
      from public.employee_onboarding_records
      order by updated_at desc
      limit 1000
    ) workspace_rows),
    'ppe_issue_records', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, employee_id, item_type, brand, size, unit_cost, order_date, collection_date, status, requested_at, office_confirmed_at, office_confirmed_by, employee_confirmed_at, employee_confirmed_by
      from public.ppe_issue_records
      order by requested_at desc
      limit 1000
    ) workspace_rows),
    'financial_types', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, name, category, is_active, is_system
      from public.financial_types
      order by name asc
      limit 1000
    ) workspace_rows),
    'issues', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, site_id, reported_by, category, description, status, severity, owner_profile_id, due_at, audit_trail, version, created_at
      from public.issues
      order by created_at desc
      limit 1000
    ) workspace_rows),
    'assets', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, registration_number, serial_number, vin, make, model, type, license_expiry, status, assigned_site_id, notes, custodian_name, asset_class, lifecycle_state, retired_at
      from public.assets
      order by license_expiry asc
      limit 1000
    ) workspace_rows),
    'admin_activity_log', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, action, entity_type, entity_id, actor_id, actor_name, details, occurred_at
      from public.admin_activity_log
      order by occurred_at desc
      limit 50
    ) workspace_rows),
    'payroll_periods', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, period_key, month, year, status, locked_at, locked_by
      from public.payroll_periods
      order by year desc, month desc
      limit 1000
    ) workspace_rows),
    'payroll_exports', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, period_key, include_full_ids, requested_by, file_name, created_at
      from public.payroll_exports
      order by created_at desc
      limit 25
    ) workspace_rows),
    'approval_requests', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, request_type, status, requested_by, requested_by_name, reviewed_by, reviewed_by_name, payload, notes, created_at, reviewed_at
      from public.approval_requests
      order by created_at desc
      limit 50
    ) workspace_rows),
    'saved_admin_views', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, name, filters, created_by, created_at
      from public.saved_admin_views
      order by created_at desc
      limit 25
    ) workspace_rows),
    'organizations', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, name, slug, is_active, created_at
      from public.organizations
      order by name asc
      limit 1000
    ) workspace_rows),
    'asset_custody_events', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, asset_id, from_site_id, to_site_id, from_custodian, to_custodian, accepted_by, notes, occurred_at
      from public.asset_custody_events
      order by occurred_at desc
      limit 1000
    ) workspace_rows),
    'asset_compliance_records', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, asset_id, compliance_type, reference_number, issued_at, expires_at, status, document_path, notes
      from public.asset_compliance_records
      order by expires_at asc
      limit 1000
    ) workspace_rows),
    'asset_meter_readings', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, asset_id, meter_type, reading, recorded_at, recorded_by, source
      from public.asset_meter_readings
      order by recorded_at desc
      limit 1000
    ) workspace_rows),
    'asset_work_orders', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, asset_id, title, description, status, priority, due_at, completed_at, cost
      from public.asset_work_orders
      order by due_at asc
      limit 1000
    ) workspace_rows),
    'asset_maintenance_plans', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, asset_id, name, interval_days, interval_meter, meter_type, next_due_at, next_due_meter, is_active
      from public.asset_maintenance_plans
      order by name asc
      limit 1000
    ) workspace_rows),
    'asset_fuel_entries', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, asset_id, fuel_date, litres, unit_cost, total_cost, odometer_km, engine_hours, supplier, reference_number, recorded_by, created_at
      from public.asset_fuel_entries
      order by fuel_date desc
      limit 1000
    ) workspace_rows),
    'vendor_accounts', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, name, description, tax_number, is_active, total_owing_amount, created_at, updated_at
      from public.vendor_accounts
      order by name asc
      limit 1000
    ) workspace_rows),
    'vendor_invoice_records', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, vendor_id, invoice_date, order_number, invoice_number, supplier_order_number, internal_order_number, items_purchased, total, responsible_person, status, requested_by, requested_by_name, director_reviewed_by, director_reviewed_at, created_at, updated_at
      from public.vendor_invoice_records
      order by created_at desc
      limit 1000
    ) workspace_rows),
    'integration_outbox', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, event_type, aggregate_type, aggregate_id, payload, status, idempotency_key, attempts, last_error, created_at, processed_at
      from public.integration_outbox
      order by created_at desc
      limit 100
    ) workspace_rows),
    'queued_sync_submissions', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at
      from public.queued_sync_submissions
      order by created_at desc
      limit 100
    ) workspace_rows),
    'issue_events', (select coalesce(jsonb_agg(to_jsonb(workspace_rows)), '[]'::jsonb) from (
      select id, issue_id, event_type, from_status, to_status, reason, actor_id, actor_name, owner_profile_id, due_at, occurred_at
      from public.issue_events
      order by occurred_at asc
      limit 1000
    ) workspace_rows)
  );
$function$;

revoke all on function public.office_workspace_snapshot_v1() from public, anon;
grant execute on function public.office_workspace_snapshot_v1() to authenticated;
comment on function public.office_workspace_snapshot_v1() is 'Versioned office workspace snapshot. Invoker RLS; same projections and limits as the legacy REST reads.';
notify pgrst, 'reload schema';
