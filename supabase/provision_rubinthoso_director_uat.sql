-- Provision UAT Account for Rubin Thoso (Executive Director)
-- Project: Senatla Operations ERP (btdavpeyxtirtshovjdu)
-- Target Username / Email: rubinthoso+uat@senatlatrading.com
-- Display Name: Rubin Thoso
-- Role: director
-- Environment: UAT Portal (https://senatla-ops-uat.vercel.app/landing)

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid := '00000000-0000-4000-8000-000000000001';
  v_email text := 'rubinthoso+uat@senatlatrading.com';
  v_display_name text := 'Rubin Thoso';
  v_role text := 'director';
  v_temp_password text := 'Sen4t!aDirectorRubinUAT2026!';
BEGIN
  -- 1. Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-4000-8000-000000000000',
      v_email,
      extensions.crypt(v_temp_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'must_change_password', true,
        'role', v_role
      ),
      jsonb_build_object('display_name', v_display_name),
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  ELSE
    -- Reset password & enforce must_change_password flag
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_temp_password, extensions.gen_salt('bf')),
      raw_app_meta_data = raw_app_meta_data || jsonb_build_object('must_change_password', true, 'role', v_role),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('display_name', v_display_name),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 2. Upsert profile in public.profiles
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    role,
    is_active,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_email,
    v_display_name,
    v_role,
    true,
    v_org_id,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    organization_id = EXCLUDED.organization_id,
    updated_at = now();

  RAISE NOTICE 'Provisioned UAT Director % (%) successfully.', v_display_name, v_email;
END $$;
