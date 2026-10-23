const ROLE_BY_VARIANT = Object.freeze({
  site_owner: 'site',
  site_peer: 'site',
  office: 'office',
  director: 'director',
  cross_org: 'site',
});

export const REQUIRED_VARIANTS = Object.freeze(Object.keys(ROLE_BY_VARIANT));
export const REQUIRED_CASES = Object.freeze([
  { id: 'permission_allow', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'permission_deny', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'capture_cancel', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'native_capture', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'process_interruption_cleanup', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'low_light_review', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'rotated_review', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'human_apply_gate', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'upload_rollback', platforms: ['android', 'ios'], variant: 'site_owner' },
  { id: 'site_owner_create', platforms: ['backend'], variant: 'site_owner' },
  { id: 'site_peer_denied', platforms: ['backend'], variant: 'site_peer' },
  { id: 'office_review', platforms: ['backend'], variant: 'office' },
  { id: 'director_review', platforms: ['backend'], variant: 'director' },
  { id: 'cross_org_denied', platforms: ['backend'], variant: 'cross_org' },
  { id: 'ready_evidence_immutable', platforms: ['backend'], variant: 'office' },
  { id: 'audit_log_redaction', platforms: ['backend'], variant: 'office' },
]);

const FORBIDDEN_KEY = /password|token|secret|authorization|cookie|service.?role|anon.?key|email|id.?number|raw.?ocr|private.?path|file.?uri|device.?serial|udid|imei/i;
const FORBIDDEN_VALUE = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}\b/i,
  /\b\d{13}\b/,
  /file:\/\//i,
  /(?:^|\s)(?:[A-Za-z]:\\|\/data\/user\/|\/var\/mobile\/)/i,
];
const SAFE_ALIAS = /^[a-z][a-z0-9_-]{2,31}$/;
const SAFE_EVIDENCE_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/;
const REQUIRED_RESULT_KEYS = new Set(
  REQUIRED_CASES.flatMap((requirement) => requirement.platforms.map((platform) => `${requirement.id}:${platform}`)),
);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inspectForLeaks(value, path, issues) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectForLeaks(item, `${path}[${index}]`, issues));
    return;
  }
  if (!isObject(value)) {
    if (typeof value === 'string' && FORBIDDEN_VALUE.some((pattern) => pattern.test(value))) {
      issues.push(`${path} contains a credential, direct identifier, or private device path.`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      issues.push(`${path}.${key} is a forbidden sensitive field.`);
    }
    inspectForLeaks(child, `${path}.${key}`, issues);
  }
}

function requireString(value, path, issues, pattern) {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push(`${path} must be a non-empty string.`);
    return false;
  }
  if (pattern && !pattern.test(value)) {
    issues.push(`${path} has an invalid format.`);
    return false;
  }
  return true;
}

export function validateUatRun(run, options = {}) {
  const issues = [];
  const allowIncomplete = options.allowIncomplete === true;
  if (!isObject(run)) return { ok: false, releaseReady: false, issues: ['root must be an object.'], summary: null };
  inspectForLeaks(run, 'root', issues);

  requireString(run.runId, 'runId', issues, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  if (run.environment !== 'remote-dev') issues.push('environment must be remote-dev.');
  if (run.projectRef !== 'btdavpeyxtirtshovjdu') issues.push('projectRef must target the approved Senatla remote-dev project.');
  requireString(run.appCommit, 'appCommit', issues, /^[0-9a-f]{40}$/i);
  const started = Date.parse(run.startedAt);
  const completed = Date.parse(run.completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) {
    issues.push('startedAt/completedAt must be valid ordered ISO timestamps.');
  }

  const participants = Array.isArray(run.participants) ? run.participants : [];
  if (participants.length !== 5) issues.push('participants must contain exactly five real UAT users.');
  const aliases = new Set();
  const byVariant = new Map();
  participants.forEach((participant, index) => {
    const path = `participants[${index}]`;
    if (!isObject(participant)) { issues.push(`${path} must be an object.`); return; }
    requireString(participant.alias, `${path}.alias`, issues, SAFE_ALIAS);
    if (aliases.has(participant.alias)) issues.push(`${path}.alias must be unique.`);
    aliases.add(participant.alias);
    if (!REQUIRED_VARIANTS.includes(participant.variant)) issues.push(`${path}.variant is not approved.`);
    if (ROLE_BY_VARIANT[participant.variant] !== participant.role) issues.push(`${path}.role does not match its access variant.`);
    requireString(participant.organizationAlias, `${path}.organizationAlias`, issues, SAFE_ALIAS);
    requireString(participant.siteAlias, `${path}.siteAlias`, issues, SAFE_ALIAS);
    if (participant.variant) {
      if (byVariant.has(participant.variant)) issues.push(`variant ${participant.variant} must appear exactly once.`);
      byVariant.set(participant.variant, participant);
    }
  });
  for (const variant of REQUIRED_VARIANTS) if (!byVariant.has(variant)) issues.push(`missing participant variant ${variant}.`);
  const owner = byVariant.get('site_owner');
  const peer = byVariant.get('site_peer');
  const office = byVariant.get('office');
  const director = byVariant.get('director');
  const crossOrg = byVariant.get('cross_org');
  if (owner && peer && owner.siteAlias === peer.siteAlias) issues.push('site_owner and site_peer must use different site aliases.');
  if (owner && office && owner.organizationAlias !== office.organizationAlias) issues.push('office must share the owner organization.');
  if (owner && director && owner.organizationAlias !== director.organizationAlias) issues.push('director must share the owner organization.');
  if (owner && crossOrg && owner.organizationAlias === crossOrg.organizationAlias) issues.push('cross_org must use a different organization alias.');

  const devices = Array.isArray(run.devices) ? run.devices : [];
  for (const platform of ['android', 'ios']) {
    const matching = devices.filter((device) => device?.platform === platform);
    if (matching.length !== 1) issues.push(`devices must contain exactly one ${platform} device.`);
  }
  devices.forEach((device, index) => {
    const path = `devices[${index}]`;
    if (!isObject(device)) { issues.push(`${path} must be an object.`); return; }
    if (!['android', 'ios'].includes(device.platform)) issues.push(`${path}.platform is invalid.`);
    requireString(device.alias, `${path}.alias`, issues, SAFE_ALIAS);
    requireString(device.osVersion, `${path}.osVersion`, issues);
    requireString(device.appBuild, `${path}.appBuild`, issues);
    if (device.signed !== true) issues.push(`${path}.signed must be true.`);
  });

  const results = Array.isArray(run.results) ? run.results : [];
  const resultKeys = new Set();
  results.forEach((result, index) => {
    const path = `results[${index}]`;
    if (!isObject(result)) { issues.push(`${path} must be an object.`); return; }
    const participant = participants.find((item) => item.alias === result.participantAlias);
    if (!participant) issues.push(`${path}.participantAlias is unknown.`);
    if (!['android', 'ios', 'backend'].includes(result.platform)) issues.push(`${path}.platform is invalid.`);
    if (!['pass', 'fail', 'blocked'].includes(result.outcome)) issues.push(`${path}.outcome is invalid.`);
    requireString(result.evidenceRef, `${path}.evidenceRef`, issues, SAFE_EVIDENCE_REF);
    if (typeof result.evidenceRef === 'string' && (result.evidenceRef.includes('..') || result.evidenceRef.startsWith('/'))) {
      issues.push(`${path}.evidenceRef must be a safe relative reference.`);
    }
    if (result.notes !== undefined && (typeof result.notes !== 'string' || result.notes.length > 500)) {
      issues.push(`${path}.notes must be at most 500 characters.`);
    }
    const key = `${result.caseId}:${result.platform}`;
    if (!REQUIRED_RESULT_KEYS.has(key)) issues.push(`${path} is not an approved case/platform result.`);
    if (resultKeys.has(key)) issues.push(`${path} duplicates ${key}.`);
    resultKeys.add(key);
  });

  for (const requirement of REQUIRED_CASES) {
    for (const platform of requirement.platforms) {
      const result = results.find((item) => item.caseId === requirement.id && item.platform === platform);
      if (!result) { issues.push(`missing result ${requirement.id}:${platform}.`); continue; }
      const participant = participants.find((item) => item.alias === result.participantAlias);
      if (participant?.variant !== requirement.variant) issues.push(`${requirement.id}:${platform} must be executed by ${requirement.variant}.`);
    }
  }

  const incomplete = results.filter((result) => result.outcome !== 'pass');
  if (!allowIncomplete && incomplete.length) issues.push(`${incomplete.length} result(s) are not pass; release is not ready.`);
  const structuralIssues = issues.filter((issue) => !issue.endsWith('release is not ready.'));
  return {
    ok: structuralIssues.length === 0 && (allowIncomplete || incomplete.length === 0),
    releaseReady: structuralIssues.length === 0 && incomplete.length === 0,
    issues,
    summary: {
      participants: participants.length,
      devices: devices.length,
      results: results.length,
      passed: results.filter((result) => result.outcome === 'pass').length,
      failed: results.filter((result) => result.outcome === 'fail').length,
      blocked: results.filter((result) => result.outcome === 'blocked').length,
    },
  };
}
