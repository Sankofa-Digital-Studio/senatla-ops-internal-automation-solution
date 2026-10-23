import {
  CostAttributionCurrencyTotals,
  CostAttributionReport,
  CostAttributionRequest,
  CostAttributionRow,
  CostRecognitionStatus,
  CostSourceType,
} from './cost-attribution.models';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const REASON_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const RECOGNITION_STATUSES = new Set<CostRecognitionStatus>(['recognized', 'not_recognized', 'provisional_unrecognized']);
const SOURCE_TYPES = new Set<CostSourceType>(['ppe', 'fuel', 'asset_work_order', 'vendor_invoice', 'labour_provisional']);
export const COST_ATTRIBUTION_POLICY_VERSION = 'cost-attribution-v1.0.0';

export class CostAttributionContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CostAttributionContractError';
  }
}

export function normalizeCostAttributionRequest(request: CostAttributionRequest): Required<CostAttributionRequest> {
  const periodStart = normalizeDate(request.periodStart, 'periodStart');
  const periodEndExclusive = normalizeDate(request.periodEndExclusive, 'periodEndExclusive');
  if (periodStart >= periodEndExclusive) {
    throw new CostAttributionContractError('periodEndExclusive must be after periodStart.');
  }

  const siteId = request.siteId?.trim() || null;
  if (siteId !== null && !UUID_PATTERN.test(siteId)) {
    throw new CostAttributionContractError('siteId must be a UUID when provided.');
  }

  return { periodStart, periodEndExclusive, siteId };
}

export function parseCostAttributionRows(value: unknown): CostAttributionRow[] {
  if (!Array.isArray(value)) {
    throw new CostAttributionContractError('Cost attribution RPC returned a non-array response.');
  }

  const rows = value.map((entry, index) => parseRow(entry, index));
  const identities = new Set<string>();
  for (const row of rows) {
    const identity = `${row.sourceType}:${row.sourceId}`;
    if (identities.has(identity)) {
      throw new CostAttributionContractError(`Cost attribution RPC returned duplicate source ${identity}.`);
    }
    identities.add(identity);
  }
  return rows;
}

export function buildCostAttributionReport(
  request: Required<CostAttributionRequest>,
  rows: CostAttributionRow[],
): CostAttributionReport {
  const policyVersions = new Set(rows.map((row) => row.policyVersion));
  if (policyVersions.size > 1) {
    throw new CostAttributionContractError('Cost attribution rows contain mixed policy versions.');
  }

  const evaluatedTimes = new Set(rows.map((row) => row.evaluatedAt));
  if (evaluatedTimes.size > 1) {
    throw new CostAttributionContractError('Cost attribution rows contain mixed evaluation timestamps.');
  }

  return {
    periodStart: request.periodStart,
    periodEndExclusive: request.periodEndExclusive,
    siteId: request.siteId,
    rows,
    unattributedRows: rows.filter(isUnattributed),
    totalsByCurrency: buildCurrencyTotals(rows),
    policyVersion: rows[0]?.policyVersion ?? null,
    evaluatedAt: rows[0]?.evaluatedAt ?? null,
  };
}

export function buildCurrencyTotals(rows: CostAttributionRow[]): CostAttributionCurrencyTotals[] {
  const totals = new Map<string, {
    sourceMinor: number;
    recognizedMinor: number;
    provisionalMinor: number;
    sourceCount: number;
    recognizedSourceCount: number;
    provisionalSourceCount: number;
    unattributedSourceCount: number;
  }>();

  for (const row of rows) {
    const current = totals.get(row.currencyCode) ?? {
      sourceMinor: 0,
      recognizedMinor: 0,
      provisionalMinor: 0,
      sourceCount: 0,
      recognizedSourceCount: 0,
      provisionalSourceCount: 0,
      unattributedSourceCount: 0,
    };
    current.sourceMinor += toMinorUnits(row.sourceAmount ?? 0);
    current.recognizedMinor += toMinorUnits(row.recognizedAmount);
    if (row.recognitionStatus === 'provisional_unrecognized') {
      current.provisionalMinor += toMinorUnits(row.sourceAmount ?? 0);
      current.provisionalSourceCount += 1;
    }
    if (row.recognitionStatus === 'recognized') current.recognizedSourceCount += 1;
    if (isUnattributed(row)) current.unattributedSourceCount += 1;
    current.sourceCount += 1;
    totals.set(row.currencyCode, current);
  }

  return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([currencyCode, total]) => ({
    currencyCode,
    sourceAmount: fromMinorUnits(total.sourceMinor),
    recognizedAmount: fromMinorUnits(total.recognizedMinor),
    provisionalAmount: fromMinorUnits(total.provisionalMinor),
    sourceCount: total.sourceCount,
    recognizedSourceCount: total.recognizedSourceCount,
    provisionalSourceCount: total.provisionalSourceCount,
    unattributedSourceCount: total.unattributedSourceCount,
  }));
}

function parseRow(value: unknown, index: number): CostAttributionRow {
  const row = requireRecord(value, `row ${index}`);
  const sourceType = requireSourceType(row['source_type'], index);
  const sourceId = requireUuid(row['source_id'], `row ${index} source_id`);
  const costDate = normalizeDate(requireString(row['cost_date'], `row ${index} cost_date`), `row ${index} cost_date`);
  const siteId = nullableUuid(row['site_id'], `row ${index} site_id`);
  const jobNumber = nullableString(row['job_number'], `row ${index} job_number`);
  const currencyCode = requireString(row['currency_code'], `row ${index} currency_code`).toUpperCase();
  if (!CURRENCY_PATTERN.test(currencyCode)) throw new CostAttributionContractError(`row ${index} currency_code is invalid.`);
  const sourceAmount = nullableMoney(row['source_amount'], `row ${index} source_amount`);
  const recognizedAmount = requireMoney(row['recognized_amount'], `row ${index} recognized_amount`);
  const recognitionStatus = requireRecognitionStatus(row['recognition_status'], index);
  const sourceStatus = requireString(row['source_status'], `row ${index} source_status`);
  const qualityReasons = requireReasonCodes(row['quality_reasons'], index);
  const policyVersion = requireString(row['policy_version'], `row ${index} policy_version`);
  if (policyVersion !== COST_ATTRIBUTION_POLICY_VERSION) {
    throw new CostAttributionContractError(`row ${index} policy_version is unsupported.`);
  }
  const evaluatedAt = requireTimestamp(row['evaluated_at'], `row ${index} evaluated_at`);

  if (recognitionStatus !== 'recognized' && recognizedAmount !== 0) {
    throw new CostAttributionContractError(`row ${index} has a recognized amount without recognized status.`);
  }
  if (sourceAmount !== null && recognizedAmount > sourceAmount) {
    throw new CostAttributionContractError(`row ${index} recognized amount exceeds its source amount.`);
  }

  return {
    sourceType,
    sourceId,
    costDate,
    siteId,
    jobNumber,
    currencyCode,
    sourceAmount,
    recognizedAmount,
    recognitionStatus,
    sourceStatus,
    allocationMetadata: parseJsonValue(row['allocation_metadata'], `row ${index} allocation_metadata`),
    qualityReasons,
    policyVersion,
    evaluatedAt,
  };
}

function isUnattributed(row: CostAttributionRow): boolean {
  return !row.siteId || !row.jobNumber || row.qualityReasons.some((reason) => reason.includes('UNATTRIBUTED') || reason.includes('SITE_MISSING') || reason.includes('JOB_NUMBER_MISSING'));
}

function normalizeDate(value: string, field: string): string {
  const normalized = value.trim();
  if (!DATE_PATTERN.test(normalized)) throw new CostAttributionContractError(`${field} must use YYYY-MM-DD.`);
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new CostAttributionContractError(`${field} is not a valid calendar date.`);
  }
  return normalized;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CostAttributionContractError(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new CostAttributionContractError(`${field} must be a non-empty string.`);
  return value.trim();
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new CostAttributionContractError(`${field} must be a string or null.`);
  return value.trim() || null;
}

function requireUuid(value: unknown, field: string): string {
  const uuid = requireString(value, field);
  if (!UUID_PATTERN.test(uuid)) throw new CostAttributionContractError(`${field} must be a UUID.`);
  return uuid;
}

function nullableUuid(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return requireUuid(value, field);
}

function requireMoney(value: unknown, field: string): number {
  const amount = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0) throw new CostAttributionContractError(`${field} must be a non-negative amount.`);
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) throw new CostAttributionContractError(`${field} must have at most two decimal places.`);
  return fromMinorUnits(toMinorUnits(amount));
}

function nullableMoney(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : requireMoney(value, field);
}

function requireRecognitionStatus(value: unknown, index: number): CostRecognitionStatus {
  if (typeof value !== 'string' || !RECOGNITION_STATUSES.has(value as CostRecognitionStatus)) {
    throw new CostAttributionContractError(`row ${index} recognition_status is invalid.`);
  }
  return value as CostRecognitionStatus;
}

function requireSourceType(value: unknown, index: number): CostSourceType {
  if (typeof value !== 'string' || !SOURCE_TYPES.has(value as CostSourceType)) {
    throw new CostAttributionContractError(`row ${index} source_type is invalid.`);
  }
  return value as CostSourceType;
}

function requireReasonCodes(value: unknown, index: number): string[] {
  if (!Array.isArray(value) || value.some((reason) => typeof reason !== 'string' || !REASON_PATTERN.test(reason))) {
    throw new CostAttributionContractError(`row ${index} quality_reasons must contain stable reason codes.`);
  }
  return [...new Set(value as string[])].sort();
}

function requireTimestamp(value: unknown, field: string): string {
  const timestamp = requireString(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) throw new CostAttributionContractError(`${field} must be an ISO timestamp.`);
  return timestamp;
}

function parseJsonValue(value: unknown, field: string): Record<string, unknown> | unknown[] | null {
  if (value === null || Array.isArray(value)) return value;
  if (typeof value === 'object') return value as Record<string, unknown>;
  throw new CostAttributionContractError(`${field} must be JSON object, array, or null.`);
}

function toMinorUnits(value: number): number {
  const minor = Math.round(value * 100);
  if (!Number.isSafeInteger(minor)) throw new CostAttributionContractError('Cost amount exceeds safe reconciliation precision.');
  return minor;
}

function fromMinorUnits(value: number): number {
  return value / 100;
}
