begin;

-- Management writes remain governed by can_manage_asset. Office Admin and
-- ordinary Directors still need organization-wide asset detail for oversight.
alter policy asset_compliance_records_read on public.asset_compliance_records
  using (organization_id = private.current_organization_id()
    and (public.can_read_admin_workspace() or private.can_manage_asset(asset_id, organization_id)));
alter policy asset_custody_events_read on public.asset_custody_events
  using (organization_id = private.current_organization_id()
    and (public.can_read_admin_workspace() or private.can_manage_asset(asset_id, organization_id)));
alter policy asset_fuel_read on public.asset_fuel_entries
  using (organization_id = private.current_organization_id()
    and (public.can_read_admin_workspace() or private.can_manage_asset(asset_id, organization_id)));
alter policy asset_maintenance_plans_read on public.asset_maintenance_plans
  using (organization_id = private.current_organization_id()
    and (public.can_read_admin_workspace() or private.can_manage_asset(asset_id, organization_id)));
alter policy asset_meter_readings_read on public.asset_meter_readings
  using (organization_id = private.current_organization_id()
    and (public.can_read_admin_workspace() or private.can_manage_asset(asset_id, organization_id)));
alter policy asset_work_orders_read on public.asset_work_orders
  using (organization_id = private.current_organization_id()
    and (public.can_read_admin_workspace() or private.can_manage_asset(asset_id, organization_id)));

commit;
