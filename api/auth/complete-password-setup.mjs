export function buildCompletePasswordSetupHandler({ createAdminClient }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const supabaseUrl = process.env.SENATLA_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ error: 'Supabase admin configuration is missing.' });
      return;
    }
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token.' });
      return;
    }
    const password = `${req.body?.password || ''}`;
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Unable to verify account session.' });
      return;
    }

    const user = data.user;
    if (user.app_metadata?.must_change_password !== true) {
      res.status(409).json({ error: 'This account is not awaiting password setup.' });
      return;
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: { ...user.app_metadata, must_change_password: false },
    });
    if (updateError) {
      res.status(500).json({ error: 'Unable to complete account password setup.' });
      return;
    }

    res.status(200).json({ ok: true });
  };
}
