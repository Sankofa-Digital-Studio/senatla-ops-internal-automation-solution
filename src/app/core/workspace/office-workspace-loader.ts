import type { SupabaseClient } from '@supabase/supabase-js';

export const OFFICE_WORKSPACE_QUERIES: ReadonlyArray<{ table: string; columns: string; order: ReadonlyArray<{ column: string; ascending: boolean }>; limit: number }> = [
  {
    "table": "profiles",
    "columns": "id, username, display_name, role, is_active, created_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "sites",
    "columns": "id, organization_id, name, location, manager_profile_id, team_name, job_number, estimated_duration, compliance_checklist, is_active",
    "order": [
      {
        "column": "name",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "employee_groups",
    "columns": "id, name, is_active",
    "order": [
      {
        "column": "name",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "employees",
    "columns": "id, organization_id, first_name, surname, id_number, company_number, role, designation, site_id, group_id, employment_status, start_date, basic_rate, pay_rate_unit, safety_qualifications, additional_fields, salary_advances, financials, logs, adjustments, tax_ref_number",
    "order": [
      {
        "column": "surname",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "employee_onboarding_records",
    "columns": "id, organization_id, employee_id, criminal_check_status, fingerprint_check_status, medical_status, red_ticket_number, red_ticket_issued_at, red_ticket_expires_at, notes, updated_at",
    "order": [
      {
        "column": "updated_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "ppe_issue_records",
    "columns": "id, organization_id, employee_id, item_type, brand, size, unit_cost, order_date, collection_date, status, requested_at, office_confirmed_at, office_confirmed_by, employee_confirmed_at, employee_confirmed_by",
    "order": [
      {
        "column": "requested_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "financial_types",
    "columns": "id, name, category, is_active, is_system",
    "order": [
      {
        "column": "name",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "issues",
    "columns": "id, organization_id, site_id, reported_by, category, description, status, severity, owner_profile_id, due_at, audit_trail, version, created_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "assets",
    "columns": "id, organization_id, registration_number, serial_number, vin, make, model, type, license_expiry, status, assigned_site_id, notes, custodian_name, asset_class, lifecycle_state, retired_at",
    "order": [
      {
        "column": "license_expiry",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "admin_activity_log",
    "columns": "id, organization_id, action, entity_type, entity_id, actor_id, actor_name, details, occurred_at",
    "order": [
      {
        "column": "occurred_at",
        "ascending": false
      }
    ],
    "limit": 50
  },
  {
    "table": "payroll_periods",
    "columns": "id, organization_id, period_key, month, year, status, locked_at, locked_by",
    "order": [
      {
        "column": "year",
        "ascending": false
      },
      {
        "column": "month",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "payroll_exports",
    "columns": "id, organization_id, period_key, include_full_ids, requested_by, file_name, created_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 25
  },
  {
    "table": "approval_requests",
    "columns": "id, organization_id, request_type, status, requested_by, requested_by_name, reviewed_by, reviewed_by_name, payload, notes, created_at, reviewed_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 50
  },
  {
    "table": "saved_admin_views",
    "columns": "id, organization_id, name, filters, created_by, created_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 25
  },
  {
    "table": "organizations",
    "columns": "id, name, slug, is_active, created_at",
    "order": [
      {
        "column": "name",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "asset_custody_events",
    "columns": "id, organization_id, asset_id, from_site_id, to_site_id, from_custodian, to_custodian, accepted_by, notes, occurred_at",
    "order": [
      {
        "column": "occurred_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "asset_compliance_records",
    "columns": "id, organization_id, asset_id, compliance_type, reference_number, issued_at, expires_at, status, document_path, notes",
    "order": [
      {
        "column": "expires_at",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "asset_meter_readings",
    "columns": "id, organization_id, asset_id, meter_type, reading, recorded_at, recorded_by, source",
    "order": [
      {
        "column": "recorded_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "asset_work_orders",
    "columns": "id, organization_id, asset_id, title, description, status, priority, due_at, completed_at, cost",
    "order": [
      {
        "column": "due_at",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "asset_maintenance_plans",
    "columns": "id, organization_id, asset_id, name, interval_days, interval_meter, meter_type, next_due_at, next_due_meter, is_active",
    "order": [
      {
        "column": "name",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "asset_fuel_entries",
    "columns": "id, organization_id, asset_id, fuel_date, litres, unit_cost, total_cost, odometer_km, engine_hours, supplier, reference_number, recorded_by, created_at",
    "order": [
      {
        "column": "fuel_date",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "vendor_accounts",
    "columns": "id, organization_id, name, description, tax_number, is_active, total_owing_amount, created_at, updated_at",
    "order": [
      {
        "column": "name",
        "ascending": true
      }
    ],
    "limit": 1000
  },
  {
    "table": "vendor_invoice_records",
    "columns": "id, organization_id, vendor_id, invoice_date, order_number, invoice_number, supplier_order_number, internal_order_number, items_purchased, total, responsible_person, status, requested_by, requested_by_name, director_reviewed_by, director_reviewed_at, created_at, updated_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 1000
  },
  {
    "table": "integration_outbox",
    "columns": "id, organization_id, event_type, aggregate_type, aggregate_id, payload, status, idempotency_key, attempts, last_error, created_at, processed_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 100
  },
  {
    "table": "queued_sync_submissions",
    "columns": "id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at",
    "order": [
      {
        "column": "created_at",
        "ascending": false
      }
    ],
    "limit": 100
  },
  {
    "table": "issue_events",
    "columns": "id, issue_id, event_type, from_status, to_status, reason, actor_id, actor_name, owner_profile_id, due_at, occurred_at",
    "order": [
      {
        "column": "occurred_at",
        "ascending": true
      }
    ],
    "limit": 1000
  }
];

export type OfficeWorkspaceRows = Record<string, unknown[]>;

export async function loadLegacyOfficeWorkspaceRows(client: SupabaseClient): Promise<OfficeWorkspaceRows> {
  const results = await Promise.all(OFFICE_WORKSPACE_QUERIES.map(async (definition) => {
    let query = client.from(definition.table).select(definition.columns);
    for (const order of definition.order) query = query.order(order.column, { ascending: order.ascending });
    const { data, error } = await query.limit(definition.limit);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Workspace response is incomplete.');
    return [definition.table, data] as const;
  }));
  return Object.fromEntries(results);
}

/** One invoker-rights database snapshot; old deployments remain usable during rollout. */
export async function loadOfficeWorkspaceRows(client: SupabaseClient): Promise<OfficeWorkspaceRows> {
  const { data, error } = await client.rpc('office_workspace_snapshot_v1');
  if (error) {
    if (error.code === 'PGRST202') return loadLegacyOfficeWorkspaceRows(client);
    throw error;
  }
  if (!data || OFFICE_WORKSPACE_QUERIES.some(({ table }) => !Array.isArray(data[table]))) {
    throw new Error('Workspace response is incomplete.');
  }
  return data as OfficeWorkspaceRows;
}
