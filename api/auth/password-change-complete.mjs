import { createClient } from '@supabase/supabase-js';

export function buildPasswordChangeCompleteHandler({ createAdminClient = createClient, now = () => new Date() } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const supabaseUrl = process.env.SENATLA_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ error: 'Supabase admin configuration is missing.' });
      return;
    }
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token.' });
      return;
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id || !isAllowedEmail(user.email || '')) {
      res.status(401).json({ error: 'Unable to verify password-change session.' });
      return;
    }

    const currentMetadata = user.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {};
    if (currentMetadata.must_change_password !== true) {
      res.status(200).json({ ok: true, alreadyComplete: true });
      return;
    }

    const completedAt = now().toISOString();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...currentMetadata,
        must_change_password: false,
        password_changed_at: completedAt,
      },
    });
    if (updateError) {
      res.status(500).json({ error: 'Password changed, but account activation could not be completed.' });
      return;
    }

    res.status(200).json({ ok: true, alreadyComplete: false });
  };
}

function isAllowedEmail(value) {
  const email = `${value || ''}`.trim().toLowerCase();
  return /^[^@\s]+@senatlatrading\.com$/.test(email)
    || email === 'thosontula@gmail.com'
    || /^thosontula\+[a-z0-9._-]+@gmail\.com$/.test(email);
}

export default buildPasswordChangeCompleteHandler();
