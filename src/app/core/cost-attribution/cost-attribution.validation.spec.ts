import { CostAttributionRequest } from './cost-attribution.models';
import {
  COST_ATTRIBUTION_POLICY_VERSION,
  CostAttributionContractError,
  buildCostAttributionReport,
  normalizeCostAttributionRequest,
  parseCostAttributionRows,
} from './cost-attribution.validation';

const sourceId = '11000000-0000-4000-8000-000000000001';
const siteId = '12000000-0000-4000-8000-000000000001';
const request: Required<CostAttributionRequest> = { periodStart: '2026-08-01', periodEndExclusive: '2026-09-01', siteId: null };

function row(overrides: Record<string, unknown> = {}) {
  return {
    source_type: 'fuel', source_id: sourceId, cost_date: '2026-08-15', site_id: siteId, job_number: 'JOB-001',
    currency_code: 'ZAR', source_amount: '125.40', recognized_amount: '125.40', recognition_status: 'recognized',
    source_status: 'recorded', allocation_metadata: null, quality_reasons: [], policy_version: COST_ATTRIBUTION_POLICY_VERSION,
    evaluated_at: '2026-08-23T12:00:00Z', ...overrides,
  };
}

describe('cost attribution contract validation', () => {
  it('normalizes a valid exclusive date range and optional site UUID', () => {
    expect(normalizeCostAttributionRequest({ ...request, siteId })).toEqual({ ...request, siteId });
  });

  it('rejects invalid or empty date ranges before contacting the gateway', () => {
    expect(() => normalizeCostAttributionRequest({ ...request, periodStart: '2026-02-30' })).toThrowError(CostAttributionContractError);
    expect(() => normalizeCostAttributionRequest({ ...request, periodEndExclusive: request.periodStart })).toThrowError(CostAttributionContractError);
  });

  it('maps numeric database values and reconciles totals in minor units', () => {
    const rows = parseCostAttributionRows([
      row({ source_amount: '0.10', recognized_amount: '0.10' }),
      row({ source_id: '11000000-0000-4000-8000-000000000002', source_amount: '0.20', recognized_amount: '0.20' }),
    ]);
    const total = buildCostAttributionReport(request, rows).totalsByCurrency[0];
    expect(total.recognizedAmount).toBe(0.3);
    expect(total.sourceCount).toBe(2);
  });

  it('keeps provisional labour visible without inventing an amount', () => {
    const rows = parseCostAttributionRows([row({ source_type: 'labour_provisional', source_amount: null, recognized_amount: 0,
      recognition_status: 'provisional_unrecognized', quality_reasons: ['LABOUR_RATE_UNIT_UNDEFINED', 'LABOUR_SOURCE_UNSTRUCTURED'] })]);
    const total = buildCostAttributionReport(request, rows).totalsByCurrency[0];
    expect(total.provisionalSourceCount).toBe(1);
    expect(total.provisionalAmount).toBe(0);
  });

  it('identifies missing attribution without counting a second source', () => {
    const rows = parseCostAttributionRows([row({ site_id: siteId, job_number: null, quality_reasons: ['JOB_NUMBER_MISSING'] })]);
    const report = buildCostAttributionReport(request, rows);
    expect(report.unattributedRows.length).toBe(1);
    expect(report.totalsByCurrency[0].unattributedSourceCount).toBe(1);
  });

  it('rejects duplicate sources, unsupported policies, and impossible recognition', () => {
    expect(() => parseCostAttributionRows([row(), row()])).toThrowError(/duplicate source/);
    expect(() => parseCostAttributionRows([row({ policy_version: 'unknown-policy' })])).toThrowError(/unsupported/);
    expect(() => parseCostAttributionRows([row({ recognition_status: 'not_recognized', recognized_amount: 1 })])).toThrowError(/without recognized status/);
  });
});
