import { randomBytes } from 'node:crypto';

export function buildAdminUsersHandler({ createAdminClient }) {
  return async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'PATCH') {
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

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: authUserData, error: authUserError } = await adminClient.auth.getUser(token);
    if (authUserError || !authUserData.user) {
      res.status(401).json({ error: 'Unable to verify admin session.' });
      return;
    }

    const actorId = authUserData.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, is_active, organization_id, display_name')
      .eq('id', actorId)
      .maybeSingle();

    if (profileError || profile?.role !== 'office' || !profile.is_active || !profile.organization_id) {
      res.status(403).json({ error: 'Only active office admins can manage users.' });
      return;
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      const email = normalizeEmail(payload.email);
      const displayName = `${payload.displayName || ''}`.trim();
      const role = 'readonly';
      const siteId = `${payload.siteId || ''}`.trim();

      if (!email || !displayName || !isUuid(siteId)) {
        res.status(400).json({ error: 'Email, display name, and a valid permitted site are required.' });
        return;
      }
      const { data: site, error: siteError } = await adminClient
        .from('sites')
        .select('id')
        .eq('id', siteId)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .maybeSingle();
      if (siteError || !site) {
        res.status(400).json({ error: 'Select an active site in your organization.' });
        return;
      }

      const mailApiKey = process.env.RESEND_API_KEY;
      const sender = process.env.SENATLA_EMAIL_FROM;
      const appUrl = process.env.SENATLA_APP_URL || process.env.SENATLA_PUBLIC_APP_URL;
      if (!mailApiKey || !sender || !appUrl) {
        res.status(500).json({ error: 'Invitation email configuration is missing.' });
        return;
      }
      let loginUrl;
      try {
        const parsedAppUrl = new URL(appUrl);
        if (!['http:', 'https:'].includes(parsedAppUrl.protocol)) throw new Error('Unsupported URL protocol');
        loginUrl = new URL('/login', parsedAppUrl.origin).toString();
      } catch {
        res.status(500).json({ error: 'Invitation email application URL is invalid.' });
        return;
      }

      const tempPassword = `T!mp-9-${randomBytes(32).toString('base64url')}`;

      const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: { must_change_password: true },
      });

      if (createError || !createdUserData.user?.id) {
        res.status(400).json({ error: createError?.message || 'Unable to create user.' });
        return;
      }

      const newProfile = {
        id: createdUserData.user.id,
        username: email,
        display_name: displayName,
        role,
        is_active: true,
        organization_id: profile.organization_id,
      };

      const { error: upsertError } = await adminClient.from('profiles').upsert(newProfile);
      if (upsertError) {
        const rolledBack = await rollbackCreatedUser(adminClient, createdUserData.user.id);
        res.status(rolledBack ? 400 : 500).json({
          error: rolledBack
            ? upsertError.message
            : 'Profile creation failed and account cleanup also failed; contact an administrator.',
        });
        return;
      }
      const { error: siteAccessError } = await adminClient.from('profile_site_access').upsert({
        profile_id: createdUserData.user.id,
        site_id: siteId,
        organization_id: profile.organization_id,
      });
      if (siteAccessError) {
        const rolledBack = await rollbackCreatedUser(adminClient, createdUserData.user.id);
        res.status(rolledBack ? 400 : 500).json({
          error: rolledBack
            ? siteAccessError.message
            : 'Site access assignment failed and account cleanup also failed; contact an administrator.',
        });
        return;
      }

      let emailResponse;
      try {
        emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mailApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: sender,
            to: [email],
            subject: 'Your Senatla Ops account',
            text: [
              `Hello ${displayName},`,
              '',
              'Your read-only Senatla Ops account is ready.',
              `Username: ${email}`,
              `Temporary password: ${tempPassword}`,
              '',
              `Sign in at: ${loginUrl}`,
              'You will be required to choose and confirm a new password before you can access the workspace.',
              'Please do not share this email or temporary password.',
            ].join('\n'),
          }),
        });
      } catch {
        const rolledBack = await rollbackCreatedUser(adminClient, createdUserData.user.id);
        res.status(502).json({
          error: rolledBack
            ? 'Invitation email could not be sent; the account was not created.'
            : 'Invitation email failed and account cleanup also failed; contact an administrator.',
        });
        return;
      }
      if (!emailResponse.ok) {
        const rolledBack = await rollbackCreatedUser(adminClient, createdUserData.user.id);
        res.status(502).json({
          error: rolledBack
            ? 'Invitation email could not be sent; the account was not created.'
            : 'Invitation email failed and account cleanup also failed; contact an administrator.',
        });
        return;
      }

      await recordAuthEvent(adminClient, profile, actorId, createdUserData.user.id, 'user_invited', { role, siteId });
      res.status(200).json({
        user: {
          id: newProfile.id,
          username: email,
          displayName,
          role,
          isActive: true,
          createdAt: createdUserData.user.created_at,
        },
        message: 'User created and temporary credentials were sent by email.',
      });
      return;
    }

    const payload = req.body || {};
    const action = payload.action;
    const userId = `${payload.userId || ''}`.trim();
    if (!userId || !action) {
      res.status(400).json({ error: 'Lifecycle action and userId are required.' });
      return;
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('id, username, display_name, role, is_active, organization_id')
      .eq('id', userId)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    if (targetProfileError || !targetProfile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    if (action === 'send_reset') {
      const email = normalizeEmail(targetProfile.username);
      if (!email) {
        res.status(400).json({ error: 'Target user has no work email.' });
        return;
      }
      const redirectTo = normalizeResetRedirect(payload.redirectTo);
      if (`${payload.redirectTo || ''}`.trim() && !redirectTo) {
        res.status(400).json({ error: 'Password reset redirect must use an allowed application origin.' });
        return;
      }
      const { error } = await adminClient.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      await recordAuthEvent(adminClient, profile, actorId, userId, 'password_reset_requested', {});
      res.status(200).json({ ok: true, message: `Password reset email requested for ${email}.` });
      return;
    }

    if (action === 'update_profile') {
      const email = normalizeEmail(payload.email);
      const displayName = `${payload.displayName || ''}`.trim();
      const role = payload.role;
      if (!email || !displayName || !isAppRole(role)) {
        res.status(400).json({ error: 'Email, display name, and role are required.' });
        return;
      }

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, { email });
      if (authUpdateError) {
        res.status(400).json({ error: authUpdateError.message });
        return;
      }
      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({ username: email, display_name: displayName, role })
        .eq('id', userId)
        .eq('organization_id', profile.organization_id);
      if (profileUpdateError) {
        res.status(400).json({ error: profileUpdateError.message });
        return;
      }

      if (targetProfile.role !== role) {
        await recordAuthEvent(adminClient, profile, actorId, userId, 'role_changed', { from: targetProfile.role, to: role });
      }
      res.status(200).json({
        ok: true,
        user: { id: userId, username: email, displayName, role, isActive: targetProfile.is_active },
      });
      return;
    }

    if (action !== 'activate' && action !== 'suspend') {
      res.status(400).json({ error: 'Unsupported lifecycle action.' });
      return;
    }
    if (action === 'suspend' && userId === actorId) {
      res.status(400).json({ error: 'Office administrators cannot suspend their own account.' });
      return;
    }

    const nextActive = action === 'activate';
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ is_active: nextActive })
      .eq('id', userId)
      .eq('organization_id', profile.organization_id);
    if (profileUpdateError) {
      res.status(400).json({ error: profileUpdateError.message });
      return;
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: nextActive ? 'none' : '876000h',
    });
    if (authUpdateError) {
      res.status(400).json({ error: authUpdateError.message });
      return;
    }

    await recordAuthEvent(
      adminClient,
      profile,
      actorId,
      userId,
      nextActive ? 'account_activated' : 'account_deactivated',
      {},
    );
    res.status(200).json({
      ok: true,
      user: {
        id: targetProfile.id,
        username: targetProfile.username,
        displayName: targetProfile.display_name,
        role: targetProfile.role,
        isActive: nextActive,
      },
      message: nextActive ? 'User account reactivated.' : 'User account suspended.',
    });
  };
}

export function normalizeEmail(value) {
  const email = `${value || ''}`.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function isAppRole(role) {
  return role === 'site' || role === 'office' || role === 'director' || role === 'readonly';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeResetRedirect(value) {
  const redirect = `${value || ''}`.trim();
  if (!redirect) return '';

  let parsed;
  try {
    parsed = new URL(redirect);
  } catch {
    return '';
  }

  const allowedOrigins = getAllowedResetOrigins();
  if (!allowedOrigins.has(parsed.origin)) return '';
  if (!parsed.pathname.startsWith('/login/recovery')) return '';

  return parsed.toString();
}

function getAllowedResetOrigins() {
  const configuredOrigins = [
    process.env.SENATLA_APP_URL,
    process.env.SENATLA_PUBLIC_APP_URL,
    process.env.SENATLA_ALLOWED_RESET_ORIGINS,
  ]
    .flatMap((value) => `${value || ''}`.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  const origins = new Set();
  for (const value of configuredOrigins) {
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed configuration values and continue evaluating valid ones.
    }
  }

  return origins;
}

async function recordAuthEvent(client, actor, actorId, targetProfileId, eventType, details) {
  const { error } = await client.from('auth_activity_events').insert({
    organization_id: actor.organization_id,
    actor_id: actorId,
    target_profile_id: targetProfileId,
    event_type: eventType,
    details,
  });
  if (error) throw error;
}

async function rollbackCreatedUser(client, userId) {
  try {
    const { error } = await client.auth.admin.deleteUser(userId);
    return !error;
  } catch {
    return false;
  }
}
