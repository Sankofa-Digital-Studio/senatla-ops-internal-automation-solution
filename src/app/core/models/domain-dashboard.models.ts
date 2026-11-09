export type OperationalDomain =
  | 'overall_macro'
  | 'engineering'
  | 'demolition_rehabilitation'
  | 'underground_works';

export interface DomainMetadata {
  id: OperationalDomain;
  label: string;
  shortCode: string;
  description: string;
  icon: string;
  status: 'active' | 'deferred';
  badge?: string;
  badgeTone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}

export interface WastedExpenditureAlert {
  id: string;
  category: 'scrap_variance' | 'rework_labour' | 'unallocated_overheads' | 'idle_machinery';
  description: string;
  amount: number;
  occurredAt: string;
  severity: 'warning' | 'danger';
  siteOrWorkshop: string;
}

export interface EngineeringProfitSummary {
  totalBilledRevenue: number;
  materialsExpense: number;
  labourExpense: number;
  absorbedOverheadsExpense: number;
  totalCostIncurred: number;
  netOperatingProfit: number;
  grossMarginPercent: number;
  senatlaShare70: number;
  shareholderReturn30: number;
  expenseLockStatus: 'locked' | 'unlocked';
  unassignedDrawsCount: number;
  unbilledVendorOrdersCount: number;
  isDividendDistributionPermitted: boolean;
  wastedExpenditureAlerts: WastedExpenditureAlert[];
}

export interface EngineeringOrderRecord {
  id: string;
  poNumber: string;
  client: string;
  quoteNumber: string;
  invoiceNumber: string;
  jobCardNumber: string;
  scopeDescription: string;
  status: 'draft' | 'in_progress' | 'completed' | 'pending_materials';
  value: number;
  materialsCost: number;
  labourHours: number;
  workshop: string;
  deliveryDate: string;
}

export interface WorkshopActivityMetric {
  id: string;
  name: string;
  code: 'WS-01' | 'WS-02' | 'WS-03';
  primaryActivity: string;
  activeBatches: number;
  monthlyOverhead: number;
  overheadAbsorptionRate: number; // Percentage or R/job
  nominalCapacityUtilization: number; // 0 - 100%
  status: 'nominal' | 'attention' | 'critical';
}

export interface DemolitionProject {
  id: string;
  contractName: string;
  client: string;
  totalContractValue: number;
  billedToDate: number;
  currentPhase: string;
  phaseNumber: number;
  totalPhases: number;
  progressPercent: number;
  boqTargetMarginPercent: number;
  boqActualMarginPercent: number;
  salvageTonnageRecovered: number; // tons
  copperTonnageRecovered: number; // tons
  crushedRubbleVolumeM3: number; // m³
  salvageRecoveryCredit: number; // Rand value
  environmentalComplianceScore: number; // %
  siteLocation: string;
  status: 'active' | 'near_completion' | 'planning';
}

export interface DemolitionSummary {
  totalContractsValue: number;
  totalBilledRevenue: number;
  totalActualCosts: number;
  totalSalvageCredit: number;
  blendedBoqMarginPercent: number;
  environmentalClearanceRate: number;
  activeContracts: DemolitionProject[];
}

export interface DomainFinancialRollupItem {
  domain: OperationalDomain;
  label: string;
  revenue: number;
  costs: number;
  profit: number;
  marginPercent: number;
  activeProjectsCount: number;
  status: 'nominal' | 'reconciling' | 'deferred';
}

export interface MacroFinancialRollup {
  consolidatedRevenue: number;
  consolidatedOperatingCosts: number;
  consolidatedNetProfit: number;
  consolidatedMarginPercent: number;
  domainContributions: DomainFinancialRollupItem[];
}

export interface CashFlowWorkingCapital {
  projectedInflow: number;
  auditedOutflow: number;
  netFreeCashFlow: number;
  workingCapitalRatio: number;
  unallocatedReserve: number;
}

export interface FleetUtilizationRollup {
  totalHeavyMachinery: number;
  activeInField: number;
  underMaintenance: number;
  utilizationPercent: number;
  hourlyFuelBurnRateTotal: number;
  fuelCostToDate: number;
}

export interface CrossDomainBottleneck {
  id: string;
  domain: OperationalDomain;
  domainLabel: string;
  title: string;
  detail: string;
  severity: 'medium' | 'high' | 'critical';
  impactDays: number;
  actionRequired: string;
  owner: string;
}

export interface UndergroundWorksSummary {
  isDeferred: boolean;
  plannedShafts: Array<{
    shaftNumber: string;
    name: string;
    plannedCrew: number;
    targetMillingTons: number;
    safetyComplianceScore: number;
    status: string;
  }>;
  statusMessage: string;
  resumptionQuarter: string;
}
