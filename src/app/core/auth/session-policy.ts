import { AuthSession } from '../models/app.models';

export const SESSION_MAX_AGE_MS = 10 * 60 * 1000;

export function cappedSessionExpiry(issuedAt: string, upstreamExpiry?: string): string {
  const issuedAtMs = Date.parse(issuedAt);
  const issued = Number.isFinite(issuedAtMs) ? issuedAtMs : Date.now();
  const cap = issued + SESSION_MAX_AGE_MS;
  const upstream = upstreamExpiry ? Date.parse(upstreamExpiry) : Number.NaN;
  return new Date(Number.isFinite(upstream) ? Math.min(cap, upstream) : cap).toISOString();
}

export function sessionHasExpired(session: Pick<AuthSession, 'expiresAt'>, now = Date.now()): boolean {
  const expiry = Date.parse(session.expiresAt);
  return !Number.isFinite(expiry) || expiry <= now;
}