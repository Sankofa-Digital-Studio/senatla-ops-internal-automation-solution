begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select ok(
  coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.prevent_payroll_period_reopen()'::regprocedure), false),
  'payroll transition trigger has an immutable empty search path'
);
select ok(
  coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.prevent_approval_redecision()'::regprocedure), false),
  'approval transition trigger has an immutable empty search path'
);
select ok(
  coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.set_updated_at()'::regprocedure), false),
  'updated-at trigger has an immutable empty search path'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'employee_groups','employees','financial_types','integration_outbox',
        'issues','payroll_periods','profile_site_access','saved_admin_views','sites'
      ])
      and roles @> array['authenticated']::name[]
      and cmd = 'ALL'
  ),
  0::bigint,
  'write policies no longer overlap SELECT through ALL'
);
select is(
  (
    select count(*)
    from (
      select tablename
      from pg_policies
      where schemaname = 'public'
        and tablename = any(array[
          'employee_groups','employees','financial_types','integration_outbox',
          'issues','payroll_periods','profile_site_access','saved_admin_views','sites'
        ])
        and roles @> array['authenticated']::name[]
        and cmd in ('SELECT', 'ALL')
      group by tablename
      having count(*) <> 1
    ) policy_mismatches
  ),
  0::bigint,
  'each hardened table has exactly one authenticated SELECT policy'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'employee_groups','employees','financial_types','integration_outbox',
        'issues','payroll_periods','profile_site_access','saved_admin_views','sites'
      ])
      and roles @> array['authenticated']::name[]
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ),
  27::bigint,
  'each hardened table retains explicit insert, update, and delete policies'
);
select matches(
  (select with_check from pg_policies where schemaname = 'public' and tablename = 'saved_admin_views' and policyname = 'saved_admin_views_insert'),
  '\( SELECT auth\.uid\(\)',
  'saved view ownership resolves auth.uid once through an initPlan'
);

select * from finish();
rollback;