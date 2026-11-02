import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const OPERATIONAL_USERS = [
  {
    email: 'brian@senatlatrading.com',
    displayName: 'Brian',
    role: 'site',
    tempPassword: 'Sen4t!aOperationsBrian2026',
    organizationId: '00000000-0000-4000-8000-000000000001',
    siteIds: ['demo-workshop', 's1'],
  },
  {
    email: 'maggie@senatlatrading.com',
    displayName: 'Maggie',
    role: 'office',
    tempPassword: 'Sen4t!aOperationsMaggie2026',
    organizationId: '00000000-0000-4000-8000-000000000001',
    siteIds: [],
  },
  {
    email: 'rubinthoso@senatlatrading.com',
    displayName: 'Rubin Thoso',
    role: 'director',
    tempPassword: 'Sen4t!aOperationsRubin2026',
    organizationId: '00000000-0000-4000-8000-000000000001',
    siteIds: [],
  },
];

/**
 * Seeds or provisions the 3 operational users into the database with temporary passwords
 * and must_change_password=true, WITHOUT dispatching initial emails.
 */
export async function seedOperationalUsers(users = OPERATIONAL_USERS, { adminClient, logger = console } = {}) {
  const results = [];
  for (const user of users) {
    let authUserId = '';
    try {
      // 1. Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = (existingUsers?.users || []).find(
        (u) => (u.email || '').toLowerCase() === user.email.toLowerCase()
      );

      if (existing) {
        authUserId = existing.id;
        // Update user to ensure temp password and must_change_password flag are set
        await adminClient.auth.admin.updateUserById(authUserId, {
          password: user.tempPassword,
          app_metadata: { must_change_password: true, role: user.role },
          user_metadata: { display_name: user.displayName },
        });
        logger.log(`[seed-users] Updated existing Auth user ${user.email} (${authUserId})`);
      } else {
        // Create new Auth user
        const { data, error } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: user.tempPassword,
          email_confirm: true,
          app_metadata: { must_change_password: true, role: user.role },
          user_metadata: { display_name: user.displayName },
        });
        if (error || !data.user?.id) throw new Error(error?.message || 'Supabase Auth user creation failed.');
        authUserId = data.user.id;
        logger.log(`[seed-users] Created Auth user ${user.email} (${authUserId})`);
      }

      // 2. Ensure profile exists and has correct role, display_name, organization_id
      const { error: profileError } = await adminClient.from('profiles').upsert(
        {
          id: authUserId,
          username: user.email,
          display_name: user.displayName,
          role: user.role,
          is_active: true,
          organization_id: user.organizationId,
        },
        { onConflict: 'id' }
      );
      if (profileError) throw new Error(`Profile sync failed: ${profileError.message}`);

      // 3. Ensure site access is populated for site users
      if (user.role === 'site' && user.siteIds.length > 0) {
        for (const siteId of user.siteIds) {
          await adminClient.from('site_access').upsert(
            {
              profile_id: authUserId,
              site_id: siteId,
              role: user.role,
            },
            { onConflict: 'profile_id,site_id' }
          );
        }
      }

      results.push({ email: user.email, role: user.role, authUserId, ok: true });
    } catch (err) {
      logger.error(`[seed-users] Failed to seed ${user.email}: ${err.message}`);
      results.push({ email: user.email, role: user.role, ok: false, error: err.message });
    }
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const supabaseUrl = process.env.SENATLA_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required to seed users into the database.');
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  seedOperationalUsers(OPERATIONAL_USERS, { adminClient }).then((results) => {
    const failures = results.filter((r) => !r.ok);
    if (failures.length > 0) {
      console.error('Seeding failed with errors:', failures);
      process.exit(1);
    }
    console.log('Seeded operational users successfully without dispatching emails.');
  });
}
