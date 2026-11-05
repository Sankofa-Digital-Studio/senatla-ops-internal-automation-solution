import { createClient } from '@supabase/supabase-js';
import { buildAdminUsersHandler } from './users-handler.mjs';

const handler = buildAdminUsersHandler({
  createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  },
});

export default handler;
