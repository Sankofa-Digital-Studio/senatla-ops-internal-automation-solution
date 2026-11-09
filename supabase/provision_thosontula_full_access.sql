-- Provision / Update Developer Full Access for Thoso Ntula (thosontula@gmail.com)
-- Grants Director, Office Admin, and Site Manager cross-workspace capabilities
-- Target Project: btdavpeyxtirtshovjdu (Senatla Operations)
-- Target Username / Email: thosontula@gmail.com
-- Display Name: Thoso Ntula
-- Role: director (Developer Director with Office Admin and Site Manager capabilities)

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid := '00000000-0000-4000-8000-000000000001';
  v_email text := 'thosontula@gmail.com';
  v_display_name text := 'Thoso Ntula';
  v_role text := 'director';
  v_temp_password text := 'Sen4t!aFullAccessThoso2026!';
  v_site record;
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
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'must_change_password', true, 'role', v_role),
      jsonb_build_object('display_name', v_display_name),
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  ELSE
    -- Update existing account with new temporary password & forced password change
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_temp_password, extensions.gen_salt('bf')),
      raw_app_meta_data = raw_app_meta_data || jsonb_build_object('must_change_password', true, 'role', v_role),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('display_name', v_display_name),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 2. Upsert profile in public.profiles with active director role
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
    is_active = true,
    organization_id = EXCLUDED.organization_id,
    updated_at = now();

  -- 3. Grant site access for all active organization sites to enable Site Manager workflow testing
  FOR v_site IN SELECT id FROM public.sites WHERE organization_id = v_org_id LOOP
    INSERT INTO public.profile_site_access (profile_id, site_id, organization_id)
    VALUES (v_user_id, v_site.id, v_org_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Provisioned full cross-workspace access for % (%) successfully.', v_display_name, v_email;
END $$;
