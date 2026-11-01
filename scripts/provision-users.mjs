import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const APP_ROLES = new Set(['site', 'office', 'director']);
const CORPORATE_EMAIL = /^[^@\s]+@senatlatrading\.com$/;
const DEVELOPER_EMAIL = 'thosontula@gmail.com';
const DEVELOPER_ALIAS = /^thosontula\+[a-z0-9._-]+@gmail\.com$/;
const STRONG_TEMP_PASSWORD = /^(?=.{12,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function normalizeProvisioningEmail(value) {
  const email = `${value || ''}`.trim().toLowerCase();
  return CORPORATE_EMAIL.test(email) || email === DEVELOPER_EMAIL || DEVELOPER_ALIAS.test(email) ? email : '';
}

export function validateProvisioningManifest(input) {
  if (!input || !Array.isArray(input.users) || input.users.length === 0) {
    throw new Error('Provisioning manifest must contain a non-empty users array.');
  }

  const seen = new Set();
  return input.users.map((entry, index) => {
    const email = normalizeProvisioningEmail(entry?.email);
    const displayName = `${entry?.displayName || ''}`.trim();
    const role = `${entry?.role || ''}`.trim();
    const tempPassword = `${entry?.tempPassword || ''}`;
    const organizationId = `${entry?.organizationId || ''}`.trim();
    const siteIds = Array.isArray(entry?.siteIds)
      ? [...new Set(entry.siteIds.map((value) => `${value || ''}`.trim()).filter(Boolean))]
      : [];

    if (!email) throw new Error(`User ${index + 1} has an unauthorized email address.`);
    if (seen.has(email)) throw new Error(`Provisioning manifest contains duplicate email ${email}.`);
    if (!displayName) throw new Error(`User ${index + 1} requires a display name.`);
    if (!APP_ROLES.has(role)) throw new Error(`User ${index + 1} has an invalid role.`);
    if (!organizationId) throw new Error(`User ${index + 1} requires an organizationId.`);
    if (!STRONG_TEMP_PASSWORD.test(tempPassword)) {
      throw new Error(`User ${index + 1} requires a temporary password with 12+ characters, upper/lowercase, number, and symbol.`);
    }
    if (role === 'site' && siteIds.length === 0) {
      throw new Error(`Site user ${index + 1} requires at least one siteId.`);
    }

    seen.add(email);
    return { email, displayName, role, tempPassword, organizationId, siteIds };
  });
}

export async function deliverTemporaryPassword({ fetchImpl, webhookUrl, webhookToken, appUrl, user }) {
  let endpoint;
  try {
    endpoint = new URL(webhookUrl);
  } catch {
    throw new Error('SENATLA_PROVISIONING_EMAIL_WEBHOOK_URL is invalid.');
  }
  if (endpoint.protocol !== 'https:') {
    throw new Error('SENATLA_PROVISIONING_EMAIL_WEBHOOK_URL must use HTTPS.');
  }

  const headers = { 'content-type': 'application/json' };
  if (webhookToken) headers.authorization = `Bearer ${webhookToken}`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      template: 'senatla-temporary-password',
      recipient: { email: user.email, displayName: user.displayName },
      temporaryPassword: user.tempPassword,
      signInUrl: appUrl,
      forcePasswordChange: true,
    }),
  });
  if (!response.ok) throw new Error(`Provisioning email webhook failed with status ${response.status}.`);
}

export async function provisionUsers(users, { adminClient, sendTemporaryPassword, logger = console }) {
  const results = [];
  for (const user of users) {
    let authUserId = '';
    try {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: user.email,
        password: user.tempPassword,
        email_confirm: true,
        app_metadata: { must_change_password: true, role: user.role },
        user_metadata: { display_name: user.displayName },
      });
      if (error || !data.user?.id) throw new Error(error?.message || 'Supabase Auth user creation failed.');
      authUserId = data.user.id;

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: authUserId,
        username: user.email,
        display_name: user.displayName,
        role: user.role,
        is_active: true,
        organization_id: user.organizationId,
      });
      if (profileError) throw new Error(profileError.message || 'Profile creation failed.');

      if (user.siteIds.length) {
        const accessRows = user.siteIds.map((siteId) => ({
          profile_id: authUserId,
          site_id: siteId,
          organization_id: user.organizationId,
        }));
        const { error: accessError } = await adminClient
          .from('profile_site_access')
          .upsert(accessRows, { onConflict: 'profile_id,site_id' });
        if (accessError) throw new Error(accessError.message || 'Site access creation failed.');
      }

      await sendTemporaryPassword(user);
      results.push({ id: authUserId, email: user.email, role: user.role });
      logger.info(`Provisioned ${user.email} as ${user.role}.`);
    } catch (error) {
      if (authUserId) {
        const { error: rollbackError } = await adminClient.auth.admin.deleteUser(authUserId);
        if (rollbackError) {
          throw new Error(`Provisioning failed for ${user.email}; automatic rollback also failed.`);
        }
      }
      throw new Error(`Provisioning failed for ${user.email}: ${safeErrorMessage(error, [user.tempPassword])}`);
    }
  }
  return results;
}

export async function runProvisioningCli({
  argv = process.argv,
  env = process.env,
  readFileImpl = readFile,
  createClientImpl = createClient,
  fetchImpl = fetch,
  logger = console,
} = {}) {
  const manifestPath = argv[2];
  if (!manifestPath) throw new Error('Usage: npm run provision:users -- <manifest.json>');

  const supabaseUrl = env.SENATLA_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookUrl = env.SENATLA_PROVISIONING_EMAIL_WEBHOOK_URL;
  const webhookToken = env.SENATLA_PROVISIONING_EMAIL_WEBHOOK_TOKEN || '';
  const appUrl = env.SENATLA_APP_URL || env.SENATLA_PUBLIC_APP_URL;
  if (!supabaseUrl || !serviceRoleKey || !webhookUrl || !appUrl) {
    throw new Error('Provisioning requires Supabase admin, email webhook, and application URL configuration.');
  }

  const manifest = JSON.parse(await readFileImpl(manifestPath, 'utf8'));
  const users = validateProvisioningManifest(manifest);
  const adminClient = createClientImpl(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sendTemporaryPassword = (user) => deliverTemporaryPassword({
    fetchImpl,
    webhookUrl,
    webhookToken,
    appUrl,
    user,
  });
  return await provisionUsers(users, { adminClient, sendTemporaryPassword, logger });
}

function safeErrorMessage(error, secrets = []) {
  const message = error instanceof Error ? error.message : 'Unknown provisioning error.';
  return secrets
    .filter(Boolean)
    .reduce((safe, secret) => safe.replaceAll(secret, '[redacted]'), message)
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[redacted]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runProvisioningCli().catch((error) => {
    console.error(safeErrorMessage(error));
    process.exitCode = 1;
  });
}
