import { Injectable } from '@angular/core';
import { AccessibleSite, ReadinessGateway, ReadinessOutcome, SiteReadinessRow } from './readiness.gateway';
import { injectSupabaseClient } from './supabase.client';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POLICY_VERSION = 'senatla-readiness-v1.0.0';
const OUTCOMES = new Set<ReadinessOutcome>(['ready', 'warning', 'blocked', 'unknown']);
const ENTITY_TYPES = new Set<SiteReadinessRow['entityType']>(['site', 'employee', 'asset']);

@Injectable()
export class SupabaseReadinessGateway implements ReadinessGateway {
  private readonly supabase = injectSupabaseClient();

  async loadAccessibleSites(permittedSiteIds: string[]): Promise<AccessibleSite[]> {
    let query = this.supabase.from('sites').select('id, name, location, job_number, team_name').eq('is_active', true).order('name');
    if (permittedSiteIds.length) query = query.in('id', permittedSiteIds);
    const { data, error } = await query;
    if (error) throw new Error('The live site list could not be loaded.');

    return (data || []).map((row) => {
      if (!isRecord(row) || !isUuid(row['id']) || !isNonEmptyString(row['name']) || !isNonEmptyString(row['location'])) {
        throw new Error('The live site list returned an invalid record.');
      }
      return {
        id: row['id'], name: row['name'].trim(), location: row['location'].trim(),
        jobNumber: optionalString(row['job_number']), teamName: optionalString(row['team_name']),
      };
    });
  }

  async evaluateSite(siteId: string): Promise<SiteReadinessRow[]> {
    if (!isUuid(siteId)) throw new Error('A valid permitted site is required for readiness evaluation.');
    const { data, error } = await this.supabase.rpc('evaluate_site_readiness', { p_site_id: siteId });
    if (error) throw new Error('Live readiness could not be evaluated for this site.');
    if (!Array.isArray(data) || data.length === 0) throw new Error('Live readiness returned no evidence.');
    return data.map((row) => this.parseRow(row));
  }

  async confirmSite(siteId: string): Promise<ReadinessOutcome> {
    if (!isUuid(siteId)) throw new Error('A valid permitted site is required for readiness confirmation.');
    const { data, error } = await this.supabase.rpc('confirm_site_readiness', { p_site_id: siteId });
    if (error) throw new Error('Live readiness changed or could not be confirmed. Refresh and review the site evidence.');
    if (!isNonEmptyString(data) || !OUTCOMES.has(data as ReadinessOutcome) || data === 'blocked' || data === 'unknown') {
      throw new Error('Live readiness returned an invalid confirmation outcome.');
    }
    return data as ReadinessOutcome;
  }

  private parseRow(value: unknown): SiteReadinessRow {
    if (!isRecord(value)) throw new Error('Live readiness returned an invalid record.');
    const entityType = value['entity_type'];
    const outcome = value['outcome'];
    const reasonCodes = value['reason_codes'];
    const correctiveActions = value['corrective_actions'];
    const evaluatedAt = value['evaluated_at'];
    if (!isNonEmptyString(entityType) || !ENTITY_TYPES.has(entityType as SiteReadinessRow['entityType']) ||
        !isUuid(value['entity_id']) || !isNonEmptyString(value['entity_label']) ||
        !isNonEmptyString(outcome) || !OUTCOMES.has(outcome as ReadinessOutcome) ||
        !isStringArray(reasonCodes) || !isStringArray(correctiveActions) ||
        value['policy_version'] !== POLICY_VERSION || !isIsoDate(evaluatedAt)) {
      throw new Error('Live readiness returned an invalid or incompatible contract.');
    }
    return {
      entityType: entityType as SiteReadinessRow['entityType'], entityId: value['entity_id'],
      entityLabel: value['entity_label'].trim(), outcome: outcome as ReadinessOutcome,
      reasonCodes, correctiveActions, policyVersion: POLICY_VERSION, evaluatedAt,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isUuid(value: unknown): value is string { return typeof value === 'string' && UUID_PATTERN.test(value); }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function optionalString(value: unknown): string | undefined { return isNonEmptyString(value) ? value.trim() : undefined; }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((entry) => typeof entry === 'string'); }
function isIsoDate(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
