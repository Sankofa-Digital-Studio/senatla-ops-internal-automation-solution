import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export function hashPin(pin, salt = 'senatla-recovery-pin-salt') {
  return crypto.createHmac('sha256', salt).update(String(pin).trim()).digest('hex');
}

export function isValidPinFormat(pin) {
  return /^[0-9]{4,5}$/.test(String(pin).trim());
}

export function buildRecoveryPinHandler({ createAdminClient = createClient, now = () => new Date() } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const supabaseUrl = process.env.SENATLA_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ error: 'Supabase admin configuration is missing.' });
      return;
    }

    const action = req.query?.action || req.body?.action;
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === 'set-pin') {
      // User must be authenticated to set a new recovery pin
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        res.status(401).json({ error: 'Authentication required to set a recovery PIN.' });
        return;
      }

      const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
      const user = authData?.user;
      if (authErr || !user?.id) {
        res.status(401).json({ error: 'Invalid user session.' });
        return;
      }

      const pin = req.body?.pin;
      if (!isValidPinFormat(pin)) {
        res.status(400).json({ error: 'Recovery PIN must be 4 or 5 digits.' });
        return;
      }

      const pinDigest = hashPin(pin);
      const thirtyDaysAgoIso = new Date(now().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Check if this pin hash was used within the last 30 days
      const { data: recentPins, error: recentPinsErr } = await adminClient
        .from('recovery_pin_history')
        .select('pin_hash, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgoIso);

      if (recentPinsErr) {
        res.status(500).json({ error: recentPinsErr.message || 'Unable to check PIN history.' });
        return;
      }

      const isReused = (recentPins || []).some((r) => r.pin_hash === pinDigest);
      if (isReused) {
        res.status(400).json({ error: 'The same PIN cannot be reused within 30 days. Choose a different PIN.' });
        return;
      }

      // Mark current pins as not current
      await adminClient
        .from('recovery_pin_history')
        .update({ is_current: false })
        .eq('user_id', user.id);

      // Insert new current PIN
      const { error: insertErr } = await adminClient
        .from('recovery_pin_history')
        .insert({
          user_id: user.id,
          pin_hash: pinDigest,
          created_at: now().toISOString(),
          is_current: true,
        });

      if (insertErr) {
        res.status(500).json({ error: insertErr.message || 'Unable to save recovery PIN.' });
        return;
      }

      res.status(200).json({ ok: true, message: 'Recovery PIN saved successfully.' });
      return;
    }

    if (action === 'verify-pin') {
      // Verifies whether email + PIN matches the user's current recovery PIN
      const email = `${req.body?.email || ''}`.trim().toLowerCase();
      const pin = req.body?.pin;

      if (!email || !isValidPinFormat(pin)) {
        res.status(400).json({ error: 'Email and 4-5 digit PIN are required.' });
        return;
      }

      // Find user by email
      const { data: userList } = await adminClient.auth.admin.listUsers();
      const user = (userList?.users || []).find((u) => (u.email || '').toLowerCase() === email);

      if (!user?.id) {
        // Do not reveal whether user exists for security
        res.status(401).json({ error: 'Invalid recovery PIN or email address.' });
        return;
      }

      const pinDigest = hashPin(pin);
      const { data: currentPin, error: pinErr } = await adminClient
        .from('recovery_pin_history')
        .select('pin_hash')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .maybeSingle();

      if (pinErr || !currentPin || currentPin.pin_hash !== pinDigest) {
        res.status(401).json({ error: 'Invalid recovery PIN or email address.' });
        return;
      }

      res.status(200).json({ ok: true, verified: true });
      return;
    }

    res.status(400).json({ error: 'Invalid action. Supported actions: set-pin, verify-pin.' });
  };
}

export default buildRecoveryPinHandler();
