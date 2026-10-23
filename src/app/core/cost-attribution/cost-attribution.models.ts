export type CostRecognitionStatus = 'recognized' | 'not_recognized' | 'provisional_unrecognized';
export type CostSourceType = 'ppe' | 'fuel' | 'asset_work_order' | 'vendor_invoice' | 'labour_provisional';

export type CostAllocationMetadata = Record<string, unknown> | unknown[] | null;

export interface CostAttributionRequest {
  periodStart: string;
  periodEndExclusive: string;
  siteId?: string | null;
}

export interface CostAttributionRow {
  sourceType: CostSourceType;
  sourceId: string;
  costDate: string;
  siteId: string | null;
  jobNumber: string | null;
  currencyCode: string;
  sourceAmount: number | null;
  recognizedAmount: number;
  recognitionStatus: CostRecognitionStatus;
  sourceStatus: string;
  allocationMetadata: CostAllocationMetadata;
  qualityReasons: string[];
  policyVersion: string;
  evaluatedAt: string;
}

export interface CostAttributionCurrencyTotals {
  currencyCode: string;
  sourceAmount: number;
  recognizedAmount: number;
  provisionalAmount: number;
  sourceCount: number;
  recognizedSourceCount: number;
  provisionalSourceCount: number;
  unattributedSourceCount: number;
}

export interface CostAttributionReport {
  periodStart: string;
  periodEndExclusive: string;
  siteId: string | null;
  rows: CostAttributionRow[];
  unattributedRows: CostAttributionRow[];
  totalsByCurrency: CostAttributionCurrencyTotals[];
  policyVersion: string | null;
  evaluatedAt: string | null;
}
