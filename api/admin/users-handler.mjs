import { createClient } from '@supabase/supabase-js';

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
    const actorEmail = `${authUserData.user.email || ''}`.trim().toLowerCase();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, is_active, organization_id, display_name')
      .eq('id', actorId)
      .maybeSingle();

    const hasFullControl = profile?.role === 'director' || actorEmail === 'thosontula@gmail.com';
    const isOfficeAdmin = profile?.role === 'office';

    if (profileError || !profile?.is_active || !profile?.organization_id || (!isOfficeAdmin && !hasFullControl)) {
      res.status(403).json({ error: 'Only authorized administrators and directors can manage users.' });
      return;
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      const email = normalizeEmail(payload.email);
      const displayName = `${payload.displayName || ''}`.trim();
      const requestedRole = payload.role || 'site';

      if (!email || !displayName || !isAppRole(requestedRole)) {
        res.status(400).json({ error: 'Email and display name are required.' });
        return;
      }

      if (requestedRole === 'director' && !hasFullControl) {
        const { data: requestData, error: requestError } = await adminClient
          .from('approval_requests')
          .insert({
            request_type: 'director_creation',
            status: 'pending',
            requested_by: actorId,
            requested_by_name: profile.display_name || 'Office Admin',
            organization_id: profile.organization_id,
            payload: { email, displayName, role: 'director' },
          })
          .select()
          .maybeSingle();

        if (requestError) {
          res.status(500).json({ error: requestError.message || 'Unable to submit director creation request.' });
          return;
        }

        await recordAuthEvent(adminClient, profile, actorId, null, 'director_creation_requested', { email, displayName });
        res.status(202).json({
          pendingApproval: true,
          requestId: requestData?.id,
          message: 'Director creation request submitted for Director approval.',
        });
        return;
      }

      const role = requestedRole;

      const { data: invitedUserData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
      if (inviteError || !invitedUserData.user?.id) {
        res.status(400).json({ error: inviteError?.message || 'Unable to invite user.' });
        return;
      }

      const newProfile = {
        id: invitedUserData.user.id,
        username: email,
        display_name: displayName,
        role,
        is_active: true,
        organization_id: profile.organization_id,
      };
      const { error: upsertError } = await adminClient.from('profiles').upsert(newProfile);
      if (upsertError) {
        res.status(400).json({ error: upsertError.message });
        return;
      }

      await recordAuthEvent(adminClient, profile, actorId, invitedUserData.user.id, 'user_invited', { role });
      res.status(200).json({
        user: {
          id: newProfile.id,
          username: email,
          displayName,
          role,
          isActive: true,
          createdAt: invitedUserData.user.created_at,
        },
      });
      return;
    }

    const payload = req.body || {};
    const action = payload.action;

    if (action === 'approve_director') {
      if (!hasFullControl) {
        res.status(403).json({ error: 'Only Directors and the developer can approve Director creation requests.' });
        return;
      }

      const requestId = `${payload.requestId || ''}`.trim();
      if (!requestId) {
        res.status(400).json({ error: 'requestId is required to approve director creation.' });
        return;
      }

      const { data: approvalReq, error: approvalErr } = await adminClient
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (approvalErr || !approvalReq || approvalReq.request_type !== 'director_creation' || approvalReq.status !== 'pending') {
        res.status(404).json({ error: 'Pending director creation request not found.' });
        return;
      }

      const { email: reqEmail, displayName: reqDisplayName } = approvalReq.payload || {};
      const normalizedEmail = normalizeEmail(reqEmail);
      if (!normalizedEmail || !reqDisplayName) {
        res.status(400).json({ error: 'Invalid director creation request payload.' });
        return;
      }

      const { data: invitedUserData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail);
      if (inviteError || !invitedUserData.user?.id) {
        res.status(400).json({ error: inviteError?.message || 'Unable to invite user.' });
        return;
      }

      const newProfile = {
        id: invitedUserData.user.id,
        username: normalizedEmail,
        display_name: reqDisplayName,
        role: 'director',
        is_active: true,
        organization_id: profile.organization_id,
      };
      const { error: upsertError } = await adminClient.from('profiles').upsert(newProfile);
      if (upsertError) {
        res.status(400).json({ error: upsertError.message });
        return;
      }

      const reviewedAt = new Date().toISOString();
      await adminClient
        .from('approval_requests')
        .update({
          status: 'approved',
          reviewed_by: actorId,
          reviewed_by_name: profile.display_name || 'Director',
          reviewed_at: reviewedAt,
        })
        .eq('id', requestId);

      await recordAuthEvent(adminClient, profile, actorId, invitedUserData.user.id, 'director_created', { role: 'director', requestId });
      res.status(200).json({
        ok: true,
        user: {
          id: newProfile.id,
          username: normalizedEmail,
          displayName: reqDisplayName,
          role: 'director',
          isActive: true,
          createdAt: invitedUserData.user.created_at,
        },
        message: 'Director creation approved and user invited.',
      });
      return;
    }

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

      if (!hasFullControl && (targetProfile.role === 'director' || role === 'director')) {
        res.status(403).json({ error: 'Office administrators cannot modify Director accounts or elevate users to Director.' });
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

    if (!hasFullControl && targetProfile.role === 'director') {
      res.status(403).json({ error: 'Office administrators cannot modify Director accounts.' });
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';

  const isCorporate = /^[^@\s]+@senatlatrading\.com$/.test(email);
  const isDeveloper = email === 'thosontula@gmail.com';
  const isDeveloperAlias = /^thosontula\+[a-z0-9._-]+@gmail\.com$/.test(email);
  return isCorporate || isDeveloper || isDeveloperAlias ? email : '';
}

export function isAppRole(role) {
  return role === 'site' || role === 'office' || role === 'director';
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
