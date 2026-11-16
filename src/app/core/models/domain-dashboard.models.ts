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

export interface JobCardMaterialItem {
  id: string;
  vendorName: string;
  vendorPoOrInvoice?: string;
  itemDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitRate: number;
  totalCost: number;
  deliveryNoteNumber?: string;
  procuredDate?: string;
}

export interface JobCardLabourItem {
  id: string;
  artisanName: string;
  role: string;
  hoursWorked: number;
  hourlyRate: number;
  totalLabourCost: number;
  shiftDate?: string;
  timesheetReference?: string;
}

export interface CommercialPlannedLabourRole {
  role: string;
  count: number;
  durationDays: number;
  baselineHourlyRate?: number;
}

export interface CommercialQuoteDocument {
  quoteNumber: string;
  quoteDate: string;
  client: string;
  addressedTo: string;
  scopeDescription: string;
  plannedRoles: CommercialPlannedLabourRole[];
  amountExclVat: number;
  validityDays: number;
  supplierName: string;
}

export interface CommercialPurchaseOrderDocument {
  poNumber: string;
  orderDate: string;
  client: string;
  buyerName: string;
  buyerEmail: string;
  requisitionNumber: string;
  deliveryWorkshop: string;
  requesterName: string;
  linePartNumber: string;
  lineDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPriceExclVat: number;
  vatRatePercent: number;
  vatAmount: number;
  totalAmountInclVat: number;
  promisedDate: string;
  neededDate: string;
  settlementTerms: string;
  referencedQuote: string;
}

export interface CommercialInvoiceDocument {
  invoiceNumber: string;
  invoiceDate: string;
  client: string;
  referencedPoNumber: string;
  referencedQuoteNumber: string;
  scopeDescription: string;
  amountExclVat: number;
  vatRatePercent: number;
  vatAmount: number;
  totalAmountInclVat: number;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
}

export interface CommercialDocumentPackage {
  id: string;
  packageCode: string;
  clientName: string;
  siteOrWorkshop: string;
  quote: CommercialQuoteDocument;
  purchaseOrder: CommercialPurchaseOrderDocument;
  invoice: CommercialInvoiceDocument;
  matchStatus: 'matched' | 'discrepancy_flagged' | 'reconciled';
  discrepancies: string[];
  isDiscrepancyAcknowledged?: boolean;
  acknowledgementNote?: string;
  linkedJobCardNumber?: string | null;
  linkedJobCardId?: string | null;
  generatedAt?: string;
}

export interface JobCardDetail {
  id: string;
  jobCardNumber: string;
  purchaseOrderNumber: string;
  client: string;
  quoteNumber?: string;
  invoiceNumber?: string;
  scopeDescription: string;
  workshop: string;
  assignedSupervisor: string;
  dateIssued: string;
  targetDeliveryDate: string;
  status: 'draft' | 'in_progress' | 'completed' | 'pending_materials';
  materials: JobCardMaterialItem[];
  labour: JobCardLabourItem[];
  totalMaterialsCost: number;
  totalLabourHours: number;
  totalLabourCost: number;
  totalDirectCost: number;
  linkedPoValue: number;
  recognizedProfit: number;
  marginPercent: number;
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
  labourCost?: number;
  workshop: string;
  deliveryDate: string;
  jobCardDetails?: JobCardDetail;
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

export interface BoqLineItem {
  section: string;
  description: string;
  estimatedCost: number;
  contractValue: number;
  marginPercent: number;
  completionPercent: number;
}

export interface MilestonePaymentClaim {
  claimNumber: string;
  phase: string;
  claimDate: string;
  certifiedDate?: string;
  claimedAmount: number;
  certifiedAmount: number;
  certifiedBy: string;
  status: 'certified' | 'pending_verification' | 'in_progress';
}

export interface SalvageWaybillRecord {
  waybillNumber: string;
  dispatchDate: string;
  materialType: 'Structural Steel' | 'Copper Cable' | 'Crushed Concrete Rubble';
  grossWeightTon: number;
  tareWeightTon: number;
  netWeightTon: number;
  unitRate: number;
  totalCreditValue: number;
  transporterName: string;
  vehicleRegistration: string;
  driverSignature: string;
  storageOfficerSignature: string;
  weighbridgeSlipNumber: string;
  dwellCheckMinutes: number;
  status: 'verified' | 'in_transit' | 'reconciled';
}

export interface EnvironmentalComplianceAudit {
  permitNumber: string;
  authority: string;
  certificateType: string;
  status: 'compliant' | 'active_clearance' | 'pending_renewal';
  inspectionScore: number;
  lastInspectedDate: string;
  notes: string;
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
  boqLineItems?: BoqLineItem[];
  paymentClaims?: MilestonePaymentClaim[];
  salvageWaybills?: SalvageWaybillRecord[];
  complianceAudits?: EnvironmentalComplianceAudit[];
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
