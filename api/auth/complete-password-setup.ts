import { createClient } from '@supabase/supabase-js';
import { buildCompletePasswordSetupHandler } from './complete-password-setup.mjs';

declare const process: { env: Record<string, string | undefined> };
const handler = buildCompletePasswordSetupHandler({
  createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  },
});

export default handler;
