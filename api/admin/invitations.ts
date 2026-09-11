import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };
type AdminProfile = { role: string; is_active: boolean; organization_id: string };

export default async function handler(req: any, res: any) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) { res.status(405).json({ error: 'Method not allowed.' }); return; }
  const url = process.env['SENATLA_SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const header = `${req.headers.authorization || ''}`;
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!url || !serviceKey) { res.status(500).json({ error: 'Supabase admin configuration is missing.' }); return; }
  if (!token) { res.status(401).json({ error: 'Missing bearer token.' }); return; }
  const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) { res.status(401).json({ error: 'Unable to verify admin session.' }); return; }
  const actorId = userData.user.id;
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('role, is_active, organization_id').eq('id', actorId).maybeSingle<AdminProfile>();
  if (profileError || profile?.role !== 'office' || !profile.is_active || !profile.organization_id) {
    res.status(403).json({ error: 'Only active office admins can manage invitation codes.' }); return;
  }
  if (req.method === 'GET') {
    const { data, error } = await client.rpc('admin_list_invitation_records', { p_actor_id: actorId, p_organization_id: profile.organization_id });
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(200).json({ invitations: (data || []).map(toInvitation) }); return;
  }
  if (req.method === 'DELETE') {
    const invitationId = `${req.body?.invitationId || ''}`.trim();
    if (!/^[0-9a-f-]{36}$/i.test(invitationId)) { res.status(400).json({ error: 'A valid invitation ID is required.' }); return; }
    const { data, error } = await client.rpc('admin_revoke_invitation_record', {
      p_actor_id: actorId, p_organization_id: profile.organization_id, p_invitation_id: invitationId,
    });
    if (error) { res.status(400).json({ error: error.message }); return; }
    if (data !== true) { res.status(409).json({ error: 'Invitation is no longer active.' }); return; }
    res.status(200).json({ ok: true }); return;
  }
  const label = `${req.body?.label || ''}`.trim();
  const expiresInHours = Number(req.body?.expiresInHours);
  const maxUses = Number(req.body?.maxUses);
  if (label.length < 3 || label.length > 80 || !Number.isInteger(expiresInHours)
    || expiresInHours < 1 || expiresInHours > 720 || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 25) {
    res.status(400).json({ error: 'Use a 3–80 character label, 1–720 hour expiry, and 1–25 uses.' }); return;
  }
  const code = `SEN-${randomBytes(24).toString('base64url')}`;
  const digest = createHash('sha256').update(code.toLowerCase()).digest('hex');
  const suffix = code.slice(-6).toLowerCase();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600000).toISOString();
  const { data: id, error } = await client.rpc('admin_issue_invitation_record', {
    p_actor_id: actorId, p_organization_id: profile.organization_id, p_label: label,
    p_digest: digest, p_suffix: suffix, p_expires_at: expiresAt, p_max_uses: maxUses,
  });
  if (error || !id) { res.status(400).json({ error: error?.message || 'Unable to issue invitation.' }); return; }
  res.status(201).json({ invitation: { id, label, codeSuffix: suffix, expiresAt, maxUses, usedCount: 0,
    status: 'active', createdAt: new Date().toISOString(), createdByName: 'You', lastUsedAt: null, revokedAt: null }, code });
}
function toInvitation(row: any) {
  return { id: row.id, label: row.label, codeSuffix: row.code_suffix, expiresAt: row.expires_at,
    maxUses: row.max_uses, usedCount: row.used_count, status: row.status, createdAt: row.created_at,
    createdByName: row.created_by_name, lastUsedAt: row.last_used_at, revokedAt: row.revoked_at };
}
