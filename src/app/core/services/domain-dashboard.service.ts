import { Injectable, computed, signal } from '@angular/core';
import {
  CashFlowWorkingCapital,
  CrossDomainBottleneck,
  DemolitionProject,
  DemolitionSummary,
  DomainMetadata,
  EngineeringOrderRecord,
  EngineeringProfitSummary,
  FleetUtilizationRollup,
  MacroFinancialRollup,
  OperationalDomain,
  UndergroundWorksSummary,
  WastedExpenditureAlert,
  WorkshopActivityMetric,
} from '../models/domain-dashboard.models';

const STORAGE_KEY = 'senatla_domain_dashboard_v1';

@Injectable({ providedIn: 'root' })
export class DomainDashboardService {
  // Domain selection
  readonly activeDomain = signal<OperationalDomain>('overall_macro');

  // Metadata for the 4 domains
  readonly domains = signal<DomainMetadata[]>([
    {
      id: 'overall_macro',
      label: 'Overall Macro Scope',
      shortCode: 'MACRO',
      description: 'Consolidated executive P&L, cross-domain cash flow, and risk radar',
      icon: 'layers',
      status: 'active',
      badge: 'Executive Rollup',
      badgeTone: 'accent',
    },
    {
      id: 'engineering',
      label: 'Engineering Operations',
      shortCode: 'ENG',
      description: 'Harmony Gold P/O pipeline, Workshops 1–3, and 70:30 profit engine',
      icon: 'settings',
      status: 'active',
      badge: '70:30 Profit Split',
      badgeTone: 'success',
    },
    {
      id: 'demolition_rehabilitation',
      label: 'Demolition & Rehab',
      shortCode: 'DEMO',
      description: 'West Gold, Tau Mine, and Mine Villages BOQ margin & salvage credits',
      icon: 'hammer',
      status: 'active',
      badge: '3 Contracts Active',
      badgeTone: 'warning',
    },
    {
      id: 'underground_works',
      label: 'Underground Works',
      shortCode: 'UG',
      description: 'Shaft operations, underground safety blocks, and consumable burn',
      icon: 'shield',
      status: 'deferred',
      badge: 'Deferred Scope',
      badgeTone: 'default',
    },
  ]);

  // Engineering State Signals
  readonly engineeringRevenue = signal<number>(4285000);
  readonly engineeringMaterials = signal<number>(1420000);
  readonly engineeringLabour = signal<number>(890000);
  readonly engineeringOverheads = signal<number>(315000);
  readonly expenseLockStatus = signal<'locked' | 'unlocked'>('locked');
  readonly unassignedDrawsCount = signal<number>(2);
  readonly unbilledVendorOrdersCount = signal<number>(1);

  readonly wastedExpenditures = signal<WastedExpenditureAlert[]>([
    {
      id: 'WASTE-01',
      category: 'scrap_variance',
      description: 'Boilermaking plate offcut variance exceeding 8% threshold in Workshop 1',
      amount: 18450,
      occurredAt: '2026-11-06T14:30:00Z',
      severity: 'warning',
      siteOrWorkshop: 'Workshop 1 (Boilermaking)',
    },
    {
      id: 'WASTE-02',
      category: 'idle_machinery',
      description: 'Wheel lathe idle time booked due to unconfirmed hydraulic seal shipment',
      amount: 32000,
      occurredAt: '2026-11-07T09:15:00Z',
      severity: 'danger',
      siteOrWorkshop: 'Workshop 2 (Train Wheels)',
    },
    {
      id: 'WASTE-03',
      category: 'unallocated_overheads',
      description: 'Workshop 3 argon gas bottle draw not mapped to active fabrication job card',
      amount: 7800,
      occurredAt: '2026-11-08T11:00:00Z',
      severity: 'warning',
      siteOrWorkshop: 'Workshop 3 (General Assembly)',
    },
  ]);

  readonly engineeringOrders = signal<EngineeringOrderRecord[]>([
    {
      id: 'EOR-101',
      poNumber: 'HAR-PO-2026-8812',
      client: 'Harmony Gold Mining Co.',
      quoteNumber: 'QUO-26-0941',
      invoiceNumber: 'INV-26-0412',
      jobCardNumber: 'JC-ENG-204',
      scopeDescription: 'Heavy underground locomotive train wheel re-profiling and axle balancing (x16 sets)',
      status: 'in_progress',
      value: 1250000,
      materialsCost: 380000,
      labourHours: 184,
      workshop: 'Workshop 2 (Train Wheels)',
      deliveryDate: '2026-11-24',
    },
    {
      id: 'EOR-102',
      poNumber: 'HAR-PO-2026-8799',
      client: 'Harmony Gold Mining Co.',
      quoteNumber: 'QUO-26-0925',
      invoiceNumber: 'INV-26-0398',
      jobCardNumber: 'JC-ENG-199',
      scopeDescription: 'Structural boilermaking: Headgear chute liner fabrication & Hardox wear plates',
      status: 'in_progress',
      value: 1680000,
      materialsCost: 620000,
      labourHours: 240,
      workshop: 'Workshop 1 (Boilermaking)',
      deliveryDate: '2026-11-18',
    },
    {
      id: 'EOR-103',
      poNumber: 'HAR-PO-2026-8750',
      client: 'Harmony Gold Mining Co.',
      quoteNumber: 'QUO-26-0880',
      invoiceNumber: 'INV-26-0371',
      jobCardNumber: 'JC-ENG-192',
      scopeDescription: 'Sub-assembly conveyor pulleys and bearing housing re-machining',
      status: 'completed',
      value: 845000,
      materialsCost: 245000,
      labourHours: 110,
      workshop: 'Workshop 3 (Assembly)',
      deliveryDate: '2026-11-04',
    },
    {
      id: 'EOR-104',
      poNumber: 'HAR-PO-2026-8845',
      client: 'Harmony Gold Mining Co.',
      quoteNumber: 'QUO-26-0955',
      invoiceNumber: 'INV-PENDING',
      jobCardNumber: 'JC-ENG-210',
      scopeDescription: 'High-pressure slurry pipeline manifold bend re-lining',
      status: 'pending_materials',
      value: 510000,
      materialsCost: 175000,
      labourHours: 65,
      workshop: 'Workshop 1 (Boilermaking)',
      deliveryDate: '2026-12-02',
    },
  ]);

  readonly workshops = signal<WorkshopActivityMetric[]>([
    {
      id: 'WS-01',
      name: 'Workshop 1: Heavy Boilermaking',
      code: 'WS-01',
      primaryActivity: 'Chute fabrication, wear plates, plasma cutting, structural welding',
      activeBatches: 6,
      monthlyOverhead: 135000,
      overheadAbsorptionRate: 14.5,
      nominalCapacityUtilization: 88,
      status: 'nominal',
    },
    {
      id: 'WS-02',
      name: 'Workshop 2: Train Wheel Manufacturing',
      code: 'WS-02',
      primaryActivity: 'Wheel turning, hydraulic press-fitting, ultrasonic axle inspection',
      activeBatches: 4,
      monthlyOverhead: 112000,
      overheadAbsorptionRate: 18.2,
      nominalCapacityUtilization: 92,
      status: 'attention',
    },
    {
      id: 'WS-03',
      name: 'Workshop 3: General Assembly & Finishing',
      code: 'WS-03',
      primaryActivity: 'Conveyor drive assembly, sandblasting, industrial epoxy coating',
      activeBatches: 3,
      monthlyOverhead: 68000,
      overheadAbsorptionRate: 11.0,
      nominalCapacityUtilization: 74,
      status: 'nominal',
    },
  ]);

  // Demolition & Rehabilitation State Signals
  readonly demolitionProjects = signal<DemolitionProject[]>([
    {
      id: 'DEM-01',
      contractName: 'West Gold Plant Decommissioning & Demolition',
      client: 'West Gold Mining Syndicate',
      totalContractValue: 6850000,
      billedToDate: 4450000,
      currentPhase: 'Phase 2: Heavy Steel & Concrete Scrap Processing',
      phaseNumber: 2,
      totalPhases: 3,
      progressPercent: 65,
      boqTargetMarginPercent: 28.0,
      boqActualMarginPercent: 31.4,
      salvageTonnageRecovered: 412,
      copperTonnageRecovered: 18.5,
      crushedRubbleVolumeM3: 3200,
      salvageRecoveryCredit: 1280000,
      environmentalComplianceScore: 98,
      siteLocation: 'West Gold Shaft 4 Compound',
      status: 'active',
    },
    {
      id: 'DEM-02',
      contractName: 'Tau Mine Heavy Industrial Salvage & Slab Removal',
      client: 'Tau Mining Operations Ltd',
      totalContractValue: 4200000,
      billedToDate: 2940000,
      currentPhase: 'Phase 2: Heavy Steel & Concrete Scrap Processing',
      phaseNumber: 2,
      totalPhases: 3,
      progressPercent: 70,
      boqTargetMarginPercent: 25.0,
      boqActualMarginPercent: 26.8,
      salvageTonnageRecovered: 285,
      copperTonnageRecovered: 9.2,
      crushedRubbleVolumeM3: 1850,
      salvageRecoveryCredit: 790000,
      environmentalComplianceScore: 94,
      siteLocation: 'Tau Mine Industrial Complex',
      status: 'active',
    },
    {
      id: 'DEM-03',
      contractName: 'Mine Villages Historical Rehab & Topsoil Revegetation',
      client: 'Free State Provincial Mining Board',
      totalContractValue: 3150000,
      billedToDate: 945000,
      currentPhase: 'Phase 1: Asbestos Abatement & Demolition Clearance',
      phaseNumber: 1,
      totalPhases: 3,
      progressPercent: 30,
      boqTargetMarginPercent: 22.0,
      boqActualMarginPercent: 23.5,
      salvageTonnageRecovered: 84,
      copperTonnageRecovered: 2.1,
      crushedRubbleVolumeM3: 980,
      salvageRecoveryCredit: 240000,
      environmentalComplianceScore: 96,
      siteLocation: 'Welkom South Mine Village Sec 2',
      status: 'active',
    },
  ]);

  // Cross-Domain Bottlenecks & Operational Radar
  readonly bottlenecks = signal<CrossDomainBottleneck[]>([
    {
      id: 'BN-01',
      domain: 'engineering',
      domainLabel: 'Engineering',
      title: 'Workshop 2 Axle Ingot Supplier Backlog',
      detail: 'Forged axle delivery delayed by 4 business days, holding JC-ENG-204 completion.',
      severity: 'high',
      impactDays: 4,
      actionRequired: 'Expedite backup supplier delivery or approve overtime turning shift.',
      owner: 'Procurement / Workshop 2 Lead',
    },
    {
      id: 'BN-02',
      domain: 'demolition_rehabilitation',
      domainLabel: 'Demolition & Rehab',
      title: 'West Gold Scrap Metal Waybill Weighbridge Certification Delay',
      detail: 'Harmony/West Gold joint-custody scale discrepancy holds 38 tons of salvage steel transfer.',
      severity: 'critical',
      impactDays: 2,
      actionRequired: 'Execute secondary weighbridge calibration and dual digital sign-off.',
      owner: 'Site Manager / Scrap Security Officer',
    },
    {
      id: 'BN-03',
      domain: 'engineering',
      domainLabel: 'Engineering',
      title: 'Anti-Inflation Expense Reconciliation Lock Active',
      detail: '2 unassigned material draws and 1 unbilled supplier PO blocking 70:30 dividend declaration.',
      severity: 'medium',
      impactDays: 1,
      actionRequired: 'Office Admin must link vendor invoice #INV-VND-8491 to active Job Card.',
      owner: 'Office Admin / Financial Controller',
    },
    {
      id: 'BN-04',
      domain: 'demolition_rehabilitation',
      domainLabel: 'Demolition & Rehab',
      title: 'Mine Villages Asbestos Disposal Permit Renewal',
      detail: 'Municipal hazardous waste transit clearance pending environmental officer sign-off.',
      severity: 'medium',
      impactDays: 3,
      actionRequired: 'Submit updated waste manifest and dust suppression logs.',
      owner: 'SHEQ Officer',
    },
  ]);

  // Fleet Telemetry Rollup
  readonly fleetTelemetry = signal<FleetUtilizationRollup>({
    totalHeavyMachinery: 14,
    activeInField: 11,
    underMaintenance: 3,
    utilizationPercent: 78.6,
    hourlyFuelBurnRateTotal: 485, // R/hr aggregated
    fuelCostToDate: 342000,
  });

  // Underground Works Preview
  readonly undergroundSummary = signal<UndergroundWorksSummary>({
    isDeferred: true,
    statusMessage:
      'Underground Works scope is currently deferred under executive directive. Active resources are prioritized for Engineering high-margin workshop fabrication and Demolition & Rehabilitation contracts.',
    resumptionQuarter: 'Q2 2027 (Post-Audit Review)',
    plannedShafts: [
      {
        shaftNumber: 'Shaft 1',
        name: 'President Steyn Main Shaft',
        plannedCrew: 48,
        targetMillingTons: 12000,
        safetyComplianceScore: 100,
        status: 'Deferred / Standby',
      },
      {
        shaftNumber: 'Shaft 3',
        name: 'Saaiplaas Vent Shaft',
        plannedCrew: 32,
        targetMillingTons: 8500,
        safetyComplianceScore: 98,
        status: 'Deferred / Standby',
      },
      {
        shaftNumber: 'Shaft 5',
        name: 'Free State Geduld Shaft 5',
        plannedCrew: 56,
        targetMillingTons: 15400,
        safetyComplianceScore: 99,
        status: 'Deferred / Standby',
      },
    ],
  });

  // COMPUTED CALCULATIONS

  // Engineering 70:30 Profit Engine
  readonly engineeringProfitSummary = computed<EngineeringProfitSummary>(() => {
    const rev = this.engineeringRevenue();
    const mat = this.engineeringMaterials();
    const lab = this.engineeringLabour();
    const ovh = this.engineeringOverheads();
    const totalCost = mat + lab + ovh;
    const netProfit = Math.max(0, rev - totalCost);
    const marginPct = rev > 0 ? (netProfit / rev) * 100 : 0;

    // 70:30 Split Calculation
    const senatla70 = Math.round(netProfit * 0.7);
    const shareholder30 = Math.round(netProfit * 0.3);

    const lock = this.expenseLockStatus();
    const unassigned = this.unassignedDrawsCount();
    const unbilled = this.unbilledVendorOrdersCount();
    const isPermitted = lock === 'unlocked' && unassigned === 0 && unbilled === 0;

    return {
      totalBilledRevenue: rev,
      materialsExpense: mat,
      labourExpense: lab,
      absorbedOverheadsExpense: ovh,
      totalCostIncurred: totalCost,
      netOperatingProfit: netProfit,
      grossMarginPercent: Number(marginPct.toFixed(1)),
      senatlaShare70: senatla70,
      shareholderReturn30: shareholder30,
      expenseLockStatus: lock,
      unassignedDrawsCount: unassigned,
      unbilledVendorOrdersCount: unbilled,
      isDividendDistributionPermitted: isPermitted,
      wastedExpenditureAlerts: this.wastedExpenditures(),
    };
  });

  // Demolition & Rehab Rollup
  readonly demolitionSummary = computed<DemolitionSummary>(() => {
    const contracts = this.demolitionProjects();
    const totalValue = contracts.reduce((sum, c) => sum + c.totalContractValue, 0);
    const billed = contracts.reduce((sum, c) => sum + c.billedToDate, 0);
    const salvage = contracts.reduce((sum, c) => sum + c.salvageRecoveryCredit, 0);

    // Approximate actual cost based on margin
    const totalCosts = contracts.reduce((sum, c) => {
      const marginRatio = c.boqActualMarginPercent / 100;
      return sum + c.billedToDate * (1 - marginRatio);
    }, 0);

    const totalProfit = billed - totalCosts + salvage;
    const blendedMargin = billed > 0 ? (totalProfit / billed) * 100 : 0;
    const avgCompliance =
      contracts.length > 0
        ? contracts.reduce((sum, c) => sum + c.environmentalComplianceScore, 0) / contracts.length
        : 100;

    return {
      totalContractsValue: totalValue,
      totalBilledRevenue: billed,
      totalActualCosts: Math.round(totalCosts),
      totalSalvageCredit: salvage,
      blendedBoqMarginPercent: Number(blendedMargin.toFixed(1)),
      environmentalClearanceRate: Number(avgCompliance.toFixed(1)),
      activeContracts: contracts,
    };
  });

  // Consolidated Macro Financial Rollup
  readonly macroFinancialRollup = computed<MacroFinancialRollup>(() => {
    const eng = this.engineeringProfitSummary();
    const demo = this.demolitionSummary();

    const engItem = {
      domain: 'engineering' as OperationalDomain,
      label: 'Engineering Operations',
      revenue: eng.totalBilledRevenue,
      costs: eng.totalCostIncurred,
      profit: eng.netOperatingProfit,
      marginPercent: eng.grossMarginPercent,
      activeProjectsCount: this.engineeringOrders().length,
      status: 'nominal' as const,
    };

    const demoProfit = demo.totalBilledRevenue - demo.totalActualCosts + demo.totalSalvageCredit;
    const demoItem = {
      domain: 'demolition_rehabilitation' as OperationalDomain,
      label: 'Demolition & Rehabilitation',
      revenue: demo.totalBilledRevenue,
      costs: demo.totalActualCosts,
      profit: demoProfit,
      marginPercent: demo.blendedBoqMarginPercent,
      activeProjectsCount: demo.activeContracts.length,
      status: 'nominal' as const,
    };

    const ugItem = {
      domain: 'underground_works' as OperationalDomain,
      label: 'Underground Works (Deferred)',
      revenue: 0,
      costs: 0,
      profit: 0,
      marginPercent: 0,
      activeProjectsCount: 0,
      status: 'deferred' as const,
    };

    const consolidatedRevenue = engItem.revenue + demoItem.revenue;
    const consolidatedCosts = engItem.costs + demoItem.costs;
    const consolidatedNetProfit = engItem.profit + demoItem.profit;
    const consolidatedMargin =
      consolidatedRevenue > 0 ? (consolidatedNetProfit / consolidatedRevenue) * 100 : 0;

    return {
      consolidatedRevenue,
      consolidatedOperatingCosts: consolidatedCosts,
      consolidatedNetProfit,
      consolidatedMarginPercent: Number(consolidatedMargin.toFixed(1)),
      domainContributions: [engItem, demoItem, ugItem],
    };
  });

  // Working Capital & Cash Flow
  readonly workingCapital = computed<CashFlowWorkingCapital>(() => {
    const macro = this.macroFinancialRollup();
    const projectedInflow = macro.consolidatedRevenue * 0.92; // 92% collection efficiency
    const auditedOutflow = macro.consolidatedOperatingCosts * 1.05; // 5% contingent cash buffer
    const netFreeCashFlow = projectedInflow - auditedOutflow;
    const workingCapitalRatio = auditedOutflow > 0 ? projectedInflow / auditedOutflow : 1.0;
    const unallocatedReserve = Math.max(0, netFreeCashFlow * 0.35);

    return {
      projectedInflow: Math.round(projectedInflow),
      auditedOutflow: Math.round(auditedOutflow),
      netFreeCashFlow: Math.round(netFreeCashFlow),
      workingCapitalRatio: Number(workingCapitalRatio.toFixed(2)),
      unallocatedReserve: Math.round(unallocatedReserve),
    };
  });

  constructor() {
    this.hydrateFromStorage();
  }

  // Domain switcher action
  selectDomain(domain: OperationalDomain): void {
    this.activeDomain.set(domain);
  }

  // Anti-Inflation Controls: Lock / Unlock & Reconcile
  toggleExpenseLock(): void {
    if (this.expenseLockStatus() === 'locked') {
      if (this.unassignedDrawsCount() > 0 || this.unbilledVendorOrdersCount() > 0) {
        // Enforce anti-inflation safety requirement: cannot unlock while unassigned items remain
        return;
      }
      this.expenseLockStatus.set('unlocked');
    } else {
      this.expenseLockStatus.set('locked');
    }
    this.persistToStorage();
  }

  reconcileUnassignedDraws(): void {
    this.unassignedDrawsCount.set(0);
    this.unbilledVendorOrdersCount.set(0);
    this.expenseLockStatus.set('unlocked');
    this.persistToStorage();
  }

  dismissWastedAlert(id: string): void {
    this.wastedExpenditures.update((alerts) => alerts.filter((a) => a.id !== id));
    this.persistToStorage();
  }

  addWastedExpenditureAlert(alert: WastedExpenditureAlert): void {
    this.wastedExpenditures.update((alerts) => [alert, ...alerts]);
    this.persistToStorage();
  }

  // Storage persistence
  private persistToStorage(): void {
    try {
      const payload = {
        activeDomain: this.activeDomain(),
        expenseLockStatus: this.expenseLockStatus(),
        unassignedDrawsCount: this.unassignedDrawsCount(),
        unbilledVendorOrdersCount: this.unbilledVendorOrdersCount(),
        wastedExpenditures: this.wastedExpenditures(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable or quota exceeded; safe to ignore
    }
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.activeDomain) this.activeDomain.set(parsed.activeDomain);
      if (parsed.expenseLockStatus) this.expenseLockStatus.set(parsed.expenseLockStatus);
      if (typeof parsed.unassignedDrawsCount === 'number')
        this.unassignedDrawsCount.set(parsed.unassignedDrawsCount);
      if (typeof parsed.unbilledVendorOrdersCount === 'number')
        this.unbilledVendorOrdersCount.set(parsed.unbilledVendorOrdersCount);
      if (Array.isArray(parsed.wastedExpenditures))
        this.wastedExpenditures.set(parsed.wastedExpenditures);
    } catch {
      // Use defaults
    }
  }
}
