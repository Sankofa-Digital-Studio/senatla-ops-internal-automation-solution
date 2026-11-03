/**
 * UNIVERSAL COSTING & BUDGETING ENGINE
 * Engineered for Senatla Ops Internal Automation Solution
 * Matches CAPM Tau Mine #10 & West Gold Plant commercial engineering standards.
 */

export interface CostingRates {
  site_est: number;          // R 35,000.00 / lot
  steel_dismantle: number;   // R 21,000.00 / structure
  concrete_breakup: number;  // R 240.00 / m³
  rubble_haul: number;       // R 120.00 / ton
  shaping_levelling: number; // R 18.50 / m²
  concrete_density: number;  // 2.40 t/m³
  fill_density: number;      // 1.70 t/m³
  pg_pct: number;            // 0.10 (10.0%)
  contingency_pct: number;   // 0.10 (10.0%)
  profit_pct: number;        // 0.05 (5.0%)
  vat_pct: number;           // 0.15 (15.0%)
}

export interface PhaseScopeItem {
  id: string;
  name: string;
  footprint_m2: number;
  structures: number;
  concrete_m3: number;
  rubble_tons?: number;
  struct_rate_override?: number;
  duration_months: number;
}

export interface PhaseDirectDetail {
  phaseId: string;
  name: string;
  footprint_m2: number;
  structures: number;
  concrete_m3: number;
  rubble_tons: number;
  duration_months: number;
  estCost: number;
  steelCost: number;
  concreteCost: number;
  haulCost: number;
  shapingCost: number;
  totalDirect: number;
}

export interface FinancialWaterfall {
  directSpend: number;
  pgAmount: number;
  subtotalExclContingencies: number;
  contingencyAmount: number;
  projectCostsA: number;
  monthlyRunRate: number;
  profitAmount: number;
  tenderPriceExclVat: number;
  vatAmount: number;
  totalTenderPriceInclVat: number;
}

export interface CashflowForecast {
  month: number;
  activePhases: string[];
  spend: number;
  cumulativeSpend: number;
  sCurvePct: number;
}

export interface ProjectCostingModel {
  id: string;
  projectName: string;
  clientName: string;
  contractRef: string;
  durationMonths: number;
  rates: CostingRates;
  phases: PhaseScopeItem[];
}

// ============================================================================
// DEFAULT RATES
// ============================================================================

export const DEFAULT_COSTING_RATES: CostingRates = {
  site_est: 35000.0,
  steel_dismantle: 21000.0,
  concrete_breakup: 240.0,
  rubble_haul: 120.0,
  shaping_levelling: 18.50,
  concrete_density: 2.40,
  fill_density: 1.70,
  pg_pct: 0.10,
  contingency_pct: 0.10,
  profit_pct: 0.05,
  vat_pct: 0.15,
};

// ============================================================================
// PRESET TEMPLATES
// ============================================================================

export const PRESET_WEST_GOLD: ProjectCostingModel = {
  id: 'west-gold-plant',
  projectName: 'West Gold Plant Demolition & Rehabilitation',
  clientName: 'West Gold Plant Operations / Senatla Trading',
  contractRef: 'WGP-DEMO-REHAB-2026-01',
  durationMonths: 12,
  rates: { ...DEFAULT_COSTING_RATES },
  phases: [
    { id: 'wgp-1', name: 'Phase 1 - Smelt House', footprint_m2: 32000, structures: 4, concrete_m3: 1800, duration_months: 2 },
    { id: 'wgp-2', name: 'Phase 2 - Thickener Dams', footprint_m2: 45000, structures: 2, concrete_m3: 3500, duration_months: 2 },
    { id: 'wgp-3', name: 'Phase 3 - Mill Section', footprint_m2: 28000, structures: 6, concrete_m3: 4200, duration_months: 3 },
    { id: 'wgp-4', name: 'Phase 4 - Silos & Fdns', footprint_m2: 15000, structures: 3, concrete_m3: 2900, duration_months: 2 },
    { id: 'wgp-5', name: 'Phase 5 - Workshops', footprint_m2: 22000, structures: 5, concrete_m3: 1400, duration_months: 2 },
    { id: 'wgp-6', name: 'Phase 6 - Conveyor Struct', footprint_m2: 18000, structures: 4, concrete_m3: 950, duration_months: 2 },
    { id: 'wgp-7', name: 'Phase 7 - Main Gate', footprint_m2: 12000, structures: 2, concrete_m3: 600, duration_months: 1 },
  ],
};

export const PRESET_SENATLA_VILLAGES: ProjectCostingModel = {
  id: 'senatla-5-villages',
  projectName: 'Senatla 5-Village Demolition & Rubble Haulage',
  clientName: 'Senatla Trading Enterprise 26 (Pty) Ltd',
  contractRef: 'STE26-VILLAGE-DEMO-REHAB-2026',
  durationMonths: 6,
  rates: { ...DEFAULT_COSTING_RATES },
  phases: [
    { id: 'vil-1', name: 'Boiketlong Village', footprint_m2: 15000, structures: 2, concrete_m3: 384, rubble_tons: 922, struct_rate_override: 21000, duration_months: 1 },
    { id: 'vil-2', name: 'Polokong Village', footprint_m2: 25000, structures: 3, concrete_m3: 962, rubble_tons: 2310, struct_rate_override: 21000, duration_months: 2 },
    { id: 'vil-3', name: 'Woolaways Village', footprint_m2: 14000, structures: 2, concrete_m3: 385, rubble_tons: 924, struct_rate_override: 21000, duration_months: 1 },
    { id: 'vil-4', name: 'Jabulani Village', footprint_m2: 26000, structures: 5, concrete_m3: 962, rubble_tons: 2310, struct_rate_override: 21000, duration_months: 2 },
    { id: 'vil-5', name: 'Pabalong Village', footprint_m2: 45000, structures: 8, concrete_m3: 2496, rubble_tons: 5992, struct_rate_override: 19500, duration_months: 3 },
  ],
};

export const PRESET_CAPM_TAU_MINE: ProjectCostingModel = {
  id: 'capm-tau-mine-10',
  projectName: 'CAPM Tau Mine #10 Demolition & Shaft Backfilling',
  clientName: 'CAPM Tau Mine Operations / Senatla Trading',
  contractRef: 'CAPM-TAU-DEMO-SHAFT-2026',
  durationMonths: 24,
  rates: { ...DEFAULT_COSTING_RATES },
  phases: [
    { id: 'tau-1', name: 'Phase 01 - Salvage & Slabs', footprint_m2: 178860, structures: 6, concrete_m3: 4500, duration_months: 3 },
    { id: 'tau-2', name: 'Phase 02 - Admin & Cooling', footprint_m2: 102294, structures: 8, concrete_m3: 6200, duration_months: 4 },
    { id: 'tau-3', name: 'Phase 03 - Kitchen Complex', footprint_m2: 141802, structures: 5, concrete_m3: 5800, duration_months: 4 },
    { id: 'tau-4', name: 'Phase 04 - Hostel Area', footprint_m2: 12763, structures: 6, concrete_m3: 3500, duration_months: 4 },
    { id: 'tau-5', name: 'Phase 05 - Workshops & Sub', footprint_m2: 119515, structures: 7, concrete_m3: 5200, duration_months: 3 },
    { id: 'tau-6', name: 'Phase 06 - Shafts & Headgears', footprint_m2: 91628, structures: 10, concrete_m3: 12800, duration_months: 6 },
    { id: 'tau-7', name: 'Phase 07 - Dams & Reservoir', footprint_m2: 264040, structures: 4, concrete_m3: 7500, duration_months: 2 },
    { id: 'tau-8', name: 'Phase 08 - Waste Rock Dump', footprint_m2: 552366, structures: 2, concrete_m3: 3200, duration_months: 12 },
  ],
};

// ============================================================================
// COMPUTATION ENGINE FUNCTIONS
// ============================================================================

export function calculatePhaseDetail(phase: PhaseScopeItem, rates: CostingRates): PhaseDirectDetail {
  const rubble_tons = phase.rubble_tons !== undefined && phase.rubble_tons > 0
    ? phase.rubble_tons
    : Math.round(phase.concrete_m3 * rates.concrete_density);

  const structRate = phase.struct_rate_override || rates.steel_dismantle;

  const estCost = rates.site_est;
  const steelCost = phase.structures * structRate;
  const concreteCost = phase.concrete_m3 * rates.concrete_breakup;
  const haulCost = rubble_tons * rates.rubble_haul;
  const shapingCost = phase.footprint_m2 * rates.shaping_levelling;
  const totalDirect = estCost + steelCost + concreteCost + haulCost + shapingCost;

  return {
    phaseId: phase.id,
    name: phase.name,
    footprint_m2: phase.footprint_m2,
    structures: phase.structures,
    concrete_m3: phase.concrete_m3,
    rubble_tons,
    duration_months: phase.duration_months,
    estCost,
    steelCost,
    concreteCost,
    haulCost,
    shapingCost,
    totalDirect,
  };
}

export function calculateWaterfall(phases: PhaseScopeItem[], rates: CostingRates, durationMonths: number): {
  phaseDetails: PhaseDirectDetail[];
  waterfall: FinancialWaterfall;
} {
  const phaseDetails = phases.map(p => calculatePhaseDetail(p, rates));
  const directSpend = phaseDetails.reduce((acc, p) => acc + p.totalDirect, 0);

  const pgAmount = directSpend * rates.pg_pct;
  const subtotalExclContingencies = directSpend + pgAmount;
  const contingencyAmount = subtotalExclContingencies * rates.contingency_pct;
  const projectCostsA = subtotalExclContingencies + contingencyAmount;
  const monthlyRunRate = durationMonths > 0 ? projectCostsA / durationMonths : 0;
  const profitAmount = projectCostsA * rates.profit_pct;
  const tenderPriceExclVat = projectCostsA + profitAmount;
  const vatAmount = tenderPriceExclVat * rates.vat_pct;
  const totalTenderPriceInclVat = tenderPriceExclVat + vatAmount;

  return {
    phaseDetails,
    waterfall: {
      directSpend,
      pgAmount,
      subtotalExclContingencies,
      contingencyAmount,
      projectCostsA,
      monthlyRunRate,
      profitAmount,
      tenderPriceExclVat,
      vatAmount,
      totalTenderPriceInclVat,
    },
  };
}

export function generateCashflowSchedule(
  waterfall: FinancialWaterfall,
  durationMonths: number
): CashflowForecast[] {
  if (durationMonths <= 0) return [];
  const schedule: CashflowForecast[] = [];
  const baseMonthly = waterfall.totalTenderPriceInclVat / durationMonths;
  let cumulative = 0;

  for (let m = 1; m <= durationMonths; m++) {
    // S-curve weighting
    const progressNorm = m / durationMonths;
    // Classic bell/S-curve adjustment factor
    const weight = 0.6 + 0.8 * Math.sin(Math.PI * progressNorm);
    const rawSpend = baseMonthly * weight;
    schedule.push({
      month: m,
      activePhases: [`Month ${m} Operations`],
      spend: rawSpend,
      cumulativeSpend: 0,
      sCurvePct: 0,
    });
  }

  // Normalize so sum equals total tender price
  const totalRaw = schedule.reduce((acc, s) => acc + s.spend, 0);
  const factor = totalRaw > 0 ? waterfall.totalTenderPriceInclVat / totalRaw : 1;

  for (const s of schedule) {
    s.spend = s.spend * factor;
    cumulative += s.spend;
    s.cumulativeSpend = cumulative;
    s.sCurvePct = waterfall.totalTenderPriceInclVat > 0 ? (cumulative / waterfall.totalTenderPriceInclVat) * 100 : 0;
  }

  return schedule;
}

export function exportModelAsCSV(model: ProjectCostingModel, waterfall: FinancialWaterfall, details: PhaseDirectDetail[]): string {
  const lines: string[] = [];
  lines.push(`"${model.projectName.toUpperCase()} - COMMERCIAL COSTING & BUDGETING MODEL"`);
  lines.push(`"Client:","${model.clientName}","Contract Ref:","${model.contractRef}","Duration:","${model.durationMonths} Months"`);
  lines.push('');
  lines.push('"EXECUTIVE FINANCIAL WATERFALL"');
  lines.push('"Level","Description","Amount (ZAR)","% Tender Price"');
  lines.push(`"Direct Spend","Total Direct Operational Expenditure",${waterfall.directSpend.toFixed(2)},"${((waterfall.directSpend / waterfall.tenderPriceExclVat) * 100).toFixed(1)}%"`);
  lines.push(`"P&G","Preliminaries & General (${(model.rates.pg_pct * 100).toFixed(0)}%)",${waterfall.pgAmount.toFixed(2)},"${((waterfall.pgAmount / waterfall.tenderPriceExclVat) * 100).toFixed(1)}%"`);
  lines.push(`"Subtotal 1","Subtotal (Excl. Contingencies)",${waterfall.subtotalExclContingencies.toFixed(2)},"-"`);
  lines.push(`"Contingency","Contingencies Allowance (${(model.rates.contingency_pct * 100).toFixed(0)}%)",${waterfall.contingencyAmount.toFixed(2)},"${((waterfall.contingencyAmount / waterfall.tenderPriceExclVat) * 100).toFixed(1)}%"`);
  lines.push(`"Cost A","Project Costs A (Excl. VAT)",${waterfall.projectCostsA.toFixed(2)},"-"`);
  lines.push(`"Run Rate","Monthly Average Run Rate",${waterfall.monthlyRunRate.toFixed(2)},"-"`);
  lines.push(`"Profit","Contractor Net Operating Profit (${(model.rates.profit_pct * 100).toFixed(1)}%)",${waterfall.profitAmount.toFixed(2)},"${((waterfall.profitAmount / waterfall.tenderPriceExclVat) * 100).toFixed(1)}%"`);
  lines.push(`"Subtotal B","Sub-Total B Tender Price (Excl. VAT)",${waterfall.tenderPriceExclVat.toFixed(2)},"100.0%"`);
  lines.push(`"VAT","SARS Value Added Tax (${(model.rates.vat_pct * 100).toFixed(0)}%)",${waterfall.vatAmount.toFixed(2)},"-"`);
  lines.push(`"Total C","TOTAL PROJECT COSTS C (INCL. VAT)",${waterfall.totalTenderPriceInclVat.toFixed(2)},"-"`);
  lines.push('');
  lines.push('"MASTER BILL OF QUANTITIES (BOQ) BREAKDOWN"');
  lines.push('"Phase Name","Footprint Area (m²)","Structures (Qty)","Concrete (m³)","Rubble (Tons)","Site Est (R)","Steel Dismantle (R)","Concrete Breakup (R)","Rubble Haul (R)","Shaping & Level (R)","Total Direct (R)"');

  for (const d of details) {
    lines.push(`"${d.name}",${d.footprint_m2},${d.structures},${d.concrete_m3},${d.rubble_tons},${d.estCost.toFixed(2)},${d.steelCost.toFixed(2)},${d.concreteCost.toFixed(2)},${d.haulCost.toFixed(2)},${d.shapingCost.toFixed(2)},${d.totalDirect.toFixed(2)}`);
  }

  lines.push(`"TOTAL DIRECT SPEND",,,,,,,,,,${waterfall.directSpend.toFixed(2)}`);
  return lines.join('\n');
}
