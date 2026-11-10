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
  JobCardDetail,
  JobCardLabourItem,
  JobCardMaterialItem,
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
      labourCost: 69600,
      workshop: 'Workshop 2 (Train Wheels)',
      deliveryDate: '2026-11-24',
      jobCardDetails: {
        id: 'JC-ENG-204',
        jobCardNumber: 'JC-ENG-204',
        purchaseOrderNumber: 'HAR-PO-2026-8812',
        client: 'Harmony Gold Mining Co.',
        quoteNumber: 'QUO-26-0941',
        invoiceNumber: 'INV-26-0412',
        scopeDescription: 'Heavy underground locomotive train wheel re-profiling and axle balancing (x16 sets)',
        workshop: 'Workshop 2 (Train Wheels)',
        assignedSupervisor: 'D. Venter (Foreman / Wheel Specialist)',
        dateIssued: '2026-10-18',
        targetDeliveryDate: '2026-11-24',
        status: 'in_progress',
        materials: [
          {
            id: 'MAT-204-1',
            vendorName: 'Scaw Metals Group',
            vendorPoOrInvoice: 'VND-PO-8812 / INV-9021',
            itemDescription: 'Forged Steel Locomotive Wheel Billets (Grade B, Dia 920mm)',
            quantity: 16,
            unitOfMeasure: 'units',
            unitRate: 15500,
            totalCost: 248000,
            deliveryNoteNumber: 'DN-SCAW-4410',
            procuredDate: '2026-10-22',
          },
          {
            id: 'MAT-204-2',
            vendorName: 'Timken South Africa',
            vendorPoOrInvoice: 'VND-PO-8815 / INV-1104',
            itemDescription: 'Heavy Haul Axle Tapered Roller Bearings & Seal Assemblies',
            quantity: 32,
            unitOfMeasure: 'units',
            unitRate: 2500,
            totalCost: 80000,
            deliveryNoteNumber: 'DN-TMK-881',
            procuredDate: '2026-10-25',
          },
          {
            id: 'MAT-204-3',
            vendorName: 'Lincoln Electric SA',
            vendorPoOrInvoice: 'VND-PO-8819 / INV-5521',
            itemDescription: 'Lincolnweld Submerged Arc Wire & Agglomerated Flux 25kg Drums',
            quantity: 26,
            unitOfMeasure: 'drums',
            unitRate: 2000,
            totalCost: 52000,
            deliveryNoteNumber: 'DN-LE-219',
            procuredDate: '2026-10-27',
          },
        ],
        labour: [
          {
            id: 'LAB-204-1',
            artisanName: 'J. Mthembu',
            role: 'Boilermaker (Red Seal)',
            hoursWorked: 64,
            hourlyRate: 350,
            totalLabourCost: 22400,
            shiftDate: '2026-10-24',
            timesheetReference: 'TS-BOIL-441',
          },
          {
            id: 'LAB-204-2',
            artisanName: 'D. Venter',
            role: 'Wheel Lathe Turner & Axle Balancing Machinist',
            hoursWorked: 80,
            hourlyRate: 380,
            totalLabourCost: 30400,
            shiftDate: '2026-10-28',
            timesheetReference: 'TS-MACH-812',
          },
          {
            id: 'LAB-204-3',
            artisanName: 'K. Nkosi',
            role: 'Ultrasonic NDT Inspector & Certified QA',
            hoursWorked: 40,
            hourlyRate: 420,
            totalLabourCost: 16800,
            shiftDate: '2026-11-02',
            timesheetReference: 'TS-NDT-339',
          },
        ],
        totalMaterialsCost: 380000,
        totalLabourHours: 184,
        totalLabourCost: 69600,
        totalDirectCost: 449600,
        linkedPoValue: 1250000,
        recognizedProfit: 800400,
        marginPercent: 64.0,
      },
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
      labourCost: 77400,
      workshop: 'Workshop 1 (Boilermaking)',
      deliveryDate: '2026-11-18',
      jobCardDetails: {
        id: 'JC-ENG-199',
        jobCardNumber: 'JC-ENG-199',
        purchaseOrderNumber: 'HAR-PO-2026-8799',
        client: 'Harmony Gold Mining Co.',
        quoteNumber: 'QUO-26-0925',
        invoiceNumber: 'INV-26-0398',
        scopeDescription: 'Structural boilermaking: Headgear chute liner fabrication & Hardox wear plates',
        workshop: 'Workshop 1 (Boilermaking)',
        assignedSupervisor: 'M. Sithole (Boilermaker Master Lead)',
        dateIssued: '2026-10-12',
        targetDeliveryDate: '2026-11-18',
        status: 'in_progress',
        materials: [
          {
            id: 'MAT-199-1',
            vendorName: 'Macsteel Trading (Pty) Ltd',
            vendorPoOrInvoice: 'VND-PO-8790 / INV-MAC-4190',
            itemDescription: 'Hardox 500 Wear Resistant Steel Plates 16mm (6000x2000)',
            quantity: 8,
            unitOfMeasure: 'sheets',
            unitRate: 45000,
            totalCost: 360000,
            deliveryNoteNumber: 'DN-MAC-9921',
            procuredDate: '2026-10-14',
          },
          {
            id: 'MAT-199-2',
            vendorName: 'Columbus Stainless',
            vendorPoOrInvoice: 'VND-PO-8794 / INV-CS-3312',
            itemDescription: '3CR12 Stainless Steel Heavy Flange Rings & Stiffeners',
            quantity: 24,
            unitOfMeasure: 'lengths',
            unitRate: 6500,
            totalCost: 156000,
            deliveryNoteNumber: 'DN-CS-781',
            procuredDate: '2026-10-18',
          },
          {
            id: 'MAT-199-3',
            vendorName: 'Afrox South Africa',
            vendorPoOrInvoice: 'VND-PO-8798 / INV-AFX-8820',
            itemDescription: 'Bulk Shielding Gas Argon/CO2 & Heavy Gouging Electrodes',
            quantity: 12,
            unitOfMeasure: 'packs',
            unitRate: 8666.67,
            totalCost: 104000,
            deliveryNoteNumber: 'DN-AFX-440',
            procuredDate: '2026-10-20',
          },
        ],
        labour: [
          {
            id: 'LAB-199-1',
            artisanName: 'M. Sithole',
            role: 'Master Boilermaker (Red Seal)',
            hoursWorked: 110,
            hourlyRate: 360,
            totalLabourCost: 39600,
            shiftDate: '2026-10-19',
            timesheetReference: 'TS-BOIL-419',
          },
          {
            id: 'LAB-199-2',
            artisanName: 'S. Dlamini',
            role: 'Coded Flux-Core Welder',
            hoursWorked: 90,
            hourlyRate: 340,
            totalLabourCost: 30600,
            shiftDate: '2026-10-23',
            timesheetReference: 'TS-WELD-221',
          },
          {
            id: 'LAB-199-3',
            artisanName: 'L. Mokoena',
            role: 'Artisan Assistant & Grinder',
            hoursWorked: 40,
            hourlyRate: 180,
            totalLabourCost: 7200,
            shiftDate: '2026-10-26',
            timesheetReference: 'TS-ASST-104',
          },
        ],
        totalMaterialsCost: 620000,
        totalLabourHours: 240,
        totalLabourCost: 77400,
        totalDirectCost: 697400,
        linkedPoValue: 1680000,
        recognizedProfit: 982600,
        marginPercent: 58.5,
      },
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
      labourCost: 40200,
      workshop: 'Workshop 3 (Assembly)',
      deliveryDate: '2026-11-04',
      jobCardDetails: {
        id: 'JC-ENG-192',
        jobCardNumber: 'JC-ENG-192',
        purchaseOrderNumber: 'HAR-PO-2026-8750',
        client: 'Harmony Gold Mining Co.',
        quoteNumber: 'QUO-26-0880',
        invoiceNumber: 'INV-26-0371',
        scopeDescription: 'Sub-assembly conveyor pulleys and bearing housing re-machining',
        workshop: 'Workshop 3 (Assembly)',
        assignedSupervisor: 'P. Van Zyl (Assembly Lead)',
        dateIssued: '2026-09-24',
        targetDeliveryDate: '2026-11-04',
        status: 'completed',
        materials: [
          {
            id: 'MAT-192-1',
            vendorName: 'SKF South Africa',
            vendorPoOrInvoice: 'VND-PO-8744 / INV-SKF-0091',
            itemDescription: 'Spherical Roller Bearings & Split Plummer Block Housings',
            quantity: 6,
            unitOfMeasure: 'sets',
            unitRate: 25000,
            totalCost: 150000,
            deliveryNoteNumber: 'DN-SKF-812',
            procuredDate: '2026-09-28',
          },
          {
            id: 'MAT-192-2',
            vendorName: 'Macsteel Trading (Pty) Ltd',
            vendorPoOrInvoice: 'VND-PO-8748 / INV-MAC-3890',
            itemDescription: 'EN8 Solid Shaft Round Bar Dia 180mm (6000mm)',
            quantity: 4,
            unitOfMeasure: 'lengths',
            unitRate: 23750,
            totalCost: 95000,
            deliveryNoteNumber: 'DN-MAC-9120',
            procuredDate: '2026-10-02',
          },
        ],
        labour: [
          {
            id: 'LAB-192-1',
            artisanName: 'P. Van Zyl',
            role: 'Precision CNC & Conventional Turner',
            hoursWorked: 70,
            hourlyRate: 380,
            totalLabourCost: 26600,
            shiftDate: '2026-10-06',
            timesheetReference: 'TS-TURN-661',
          },
          {
            id: 'LAB-192-2',
            artisanName: 'T. Khumalo',
            role: 'Mechanical Fitter & Alignment Specialist',
            hoursWorked: 40,
            hourlyRate: 340,
            totalLabourCost: 13600,
            shiftDate: '2026-10-11',
            timesheetReference: 'TS-FIT-302',
          },
        ],
        totalMaterialsCost: 245000,
        totalLabourHours: 110,
        totalLabourCost: 40200,
        totalDirectCost: 285200,
        linkedPoValue: 845000,
        recognizedProfit: 559800,
        marginPercent: 66.2,
      },
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
      labourCost: 19800,
      workshop: 'Workshop 1 (Boilermaking)',
      deliveryDate: '2026-12-02',
      jobCardDetails: {
        id: 'JC-ENG-210',
        jobCardNumber: 'JC-ENG-210',
        purchaseOrderNumber: 'HAR-PO-2026-8845',
        client: 'Harmony Gold Mining Co.',
        quoteNumber: 'QUO-26-0955',
        invoiceNumber: 'INV-PENDING',
        scopeDescription: 'High-pressure slurry pipeline manifold bend re-lining',
        workshop: 'Workshop 1 (Boilermaking)',
        assignedSupervisor: 'M. Sithole (Boilermaker Master)',
        dateIssued: '2026-10-30',
        targetDeliveryDate: '2026-12-02',
        status: 'pending_materials',
        materials: [
          {
            id: 'MAT-210-1',
            vendorName: 'Scaw Metals Group',
            vendorPoOrInvoice: 'VND-PO-8840 / INV-SCAW-9411',
            itemDescription: 'High-Chrome White Iron Slurry Elbow Liners (Bend 90 deg)',
            quantity: 4,
            unitOfMeasure: 'sets',
            unitRate: 31250,
            totalCost: 125000,
            deliveryNoteNumber: 'DN-SCAW-5502',
            procuredDate: '2026-11-01',
          },
          {
            id: 'MAT-210-2',
            vendorName: 'Columbus Stainless',
            vendorPoOrInvoice: 'VND-PO-8842 / INV-CS-3800',
            itemDescription: 'Flanged Polyurethane Gaskets & Gr 8.8 Fastener Kits',
            quantity: 10,
            unitOfMeasure: 'kits',
            unitRate: 5000,
            totalCost: 50000,
            deliveryNoteNumber: 'DN-CS-890',
            procuredDate: '2026-11-04',
          },
        ],
        labour: [
          {
            id: 'LAB-210-1',
            artisanName: 'M. Sithole',
            role: 'Master Boilermaker (Red Seal)',
            hoursWorked: 45,
            hourlyRate: 360,
            totalLabourCost: 16200,
            shiftDate: '2026-11-05',
            timesheetReference: 'TS-BOIL-490',
          },
          {
            id: 'LAB-210-2',
            artisanName: 'L. Mokoena',
            role: 'Artisan Assistant',
            hoursWorked: 20,
            hourlyRate: 180,
            totalLabourCost: 3600,
            shiftDate: '2026-11-06',
            timesheetReference: 'TS-ASST-145',
          },
        ],
        totalMaterialsCost: 175000,
        totalLabourHours: 65,
        totalLabourCost: 19800,
        totalDirectCost: 194800,
        linkedPoValue: 510000,
        recognizedProfit: 315200,
        marginPercent: 61.8,
      },
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
      boqLineItems: [
        {
          section: 'Section 1: Asbestos & Hazardous Waste Abatement',
          description: 'Friable & non-friable chrysotile cladding removal under negative pressure enclosures with HEPA exhaust',
          estimatedCost: 684000,
          contractValue: 950000,
          marginPercent: 28.0,
          completionPercent: 100,
        },
        {
          section: 'Section 2: Heavy Steel Superstructure Demolition',
          description: 'Controlled cold-cutting, explosive shape charge felling, and primary shearing of 42m processing plant',
          estimatedCost: 2176000,
          contractValue: 3200000,
          marginPercent: 32.0,
          completionPercent: 85,
        },
        {
          section: 'Section 3: Concrete Slab Breaking & Rubble Crushing',
          description: 'Hydraulic hammer slab breakout, rebar separation, and on-site mobile impact crushing to G5 road-base specification',
          estimatedCost: 1260000,
          contractValue: 1800000,
          marginPercent: 30.0,
          completionPercent: 50,
        },
        {
          section: 'Section 4: Topsoil Recontouring & Revegetation',
          description: 'Subsoil ripping, 300mm certified topsoil capping, hydroseeding with indigenous Highveld grassland mix',
          estimatedCost: 702000,
          contractValue: 900000,
          marginPercent: 22.0,
          completionPercent: 0,
        },
      ],
      paymentClaims: [
        {
          claimNumber: 'WG-PC-01',
          phase: 'Phase 1: Site Establishment & Hazardous Material Clearance',
          claimDate: '2026-08-14',
          certifiedDate: '2026-08-20',
          claimedAmount: 2200000,
          certifiedAmount: 2200000,
          certifiedBy: 'J. Van Der Merwe (Principal Consulting Engineer)',
          status: 'certified',
        },
        {
          claimNumber: 'WG-PC-02',
          phase: 'Phase 2: Heavy Structural Steel Drop & Primary Scrap Harvest',
          claimDate: '2026-10-02',
          certifiedDate: '2026-10-10',
          claimedAmount: 2250000,
          certifiedAmount: 2250000,
          certifiedBy: 'J. Van Der Merwe (Principal Consulting Engineer)',
          status: 'certified',
        },
        {
          claimNumber: 'WG-PC-03',
          phase: 'Phase 2B: Secondary Steel Processing & Slab Clearing (Interim)',
          claimDate: '2026-11-04',
          claimedAmount: 1150000,
          certifiedAmount: 0,
          certifiedBy: 'Client Quantity Surveyor (Under Audit Review)',
          status: 'pending_verification',
        },
      ],
      salvageWaybills: [
        {
          waybillNumber: 'WB-WG-26-041',
          dispatchDate: '2026-10-24',
          materialType: 'Structural Steel',
          grossWeightTon: 52.4,
          tareWeightTon: 18.28,
          netWeightTon: 34.12,
          unitRate: 2500,
          totalCreditValue: 85300,
          transporterName: 'Trans-Mining Heavy Logistics',
          vehicleRegistration: 'BF-88-GP',
          driverSignature: 'M. Khumalo (DigiSign #DK-9812)',
          storageOfficerSignature: 'P. Dlamini (DigiSign #SO-4401)',
          weighbridgeSlipNumber: 'WB-SLIP-9021',
          dwellCheckMinutes: 2.4,
          status: 'reconciled',
        },
        {
          waybillNumber: 'WB-WG-26-042',
          dispatchDate: '2026-10-29',
          materialType: 'Structural Steel',
          grossWeightTon: 46.15,
          tareWeightTon: 18.2,
          netWeightTon: 27.95,
          unitRate: 2500,
          totalCreditValue: 69875,
          transporterName: 'Trans-Mining Heavy Logistics',
          vehicleRegistration: 'BF-88-GP',
          driverSignature: 'M. Khumalo (DigiSign #DK-9812)',
          storageOfficerSignature: 'P. Dlamini (DigiSign #SO-4401)',
          weighbridgeSlipNumber: 'WB-SLIP-9024',
          dwellCheckMinutes: 2.1,
          status: 'reconciled',
        },
        {
          waybillNumber: 'WB-WG-26-043',
          dispatchDate: '2026-11-02',
          materialType: 'Copper Cable',
          grossWeightTon: 14.82,
          tareWeightTon: 6.3,
          netWeightTon: 8.52,
          unitRate: 11500,
          totalCreditValue: 97980,
          transporterName: 'SecuriTrack Special Cargo',
          vehicleRegistration: 'CZ-31-JH-GP',
          driverSignature: 'S. Zulu (DigiSign #SZ-1108)',
          storageOfficerSignature: 'P. Dlamini (DigiSign #SO-4401)',
          weighbridgeSlipNumber: 'WB-SLIP-9030',
          dwellCheckMinutes: 3.0,
          status: 'reconciled',
        },
        {
          waybillNumber: 'WB-WG-26-044',
          dispatchDate: '2026-11-06',
          materialType: 'Crushed Concrete Rubble',
          grossWeightTon: 38.6,
          tareWeightTon: 14.1,
          netWeightTon: 24.5,
          unitRate: 75,
          totalCreditValue: 1837.5,
          transporterName: 'Senatla Internal Tipper Fleet',
          vehicleRegistration: 'SN-TIP-03',
          driverSignature: 'T. Sithole (DigiSign #TS-5541)',
          storageOfficerSignature: 'P. Dlamini (DigiSign #SO-4401)',
          weighbridgeSlipNumber: 'WB-SLIP-9035',
          dwellCheckMinutes: 2.2,
          status: 'verified',
        },
      ],
      complianceAudits: [
        {
          permitNumber: 'DMRE-NC-2026-089',
          authority: 'Department of Mineral Resources & Energy (DMRE)',
          certificateType: 'Section 43 Mine Closure & Environmental Authorization',
          status: 'compliant',
          inspectionScore: 98,
          lastInspectedDate: '2026-10-18',
          notes: 'Full statutory compliance. Asbestos containment verified; ground water test wells show zero heavy-metal leaching.',
        },
        {
          permitNumber: 'ENV-ASB-9921',
          authority: 'National Dept of Forestry, Fisheries & the Environment',
          certificateType: 'Safe Asbestos Waste Transport & Disposal Manifest',
          status: 'compliant',
          inspectionScore: 100,
          lastInspectedDate: '2026-09-30',
          notes: 'Disposed at Holfontein H:H Class A hazardous facility; certificate of safe destruction on record.',
        },
      ],
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
      boqLineItems: [
        {
          section: 'Section 1: Redundant Ball Mill & Hopper Dismantling',
          description: 'Heavy crane rigging and dismantle of 4x 120t ball mills and feed chutes',
          estimatedCost: 1350000,
          contractValue: 1800000,
          marginPercent: 25.0,
          completionPercent: 100,
        },
        {
          section: 'Section 2: Reinforced Foundation Slab Hydraulic Peeling',
          description: 'Excavator mounted pecker demolition of 600mm heavily reinforced equipment foundations',
          estimatedCost: 1120000,
          contractValue: 1500000,
          marginPercent: 25.3,
          completionPercent: 60,
        },
        {
          section: 'Section 3: Slag Heap Grading & Surface Capping',
          description: 'Spreading, lime-stabilizing, and clay-capping historical smelting slag footprint',
          estimatedCost: 608000,
          contractValue: 900000,
          marginPercent: 32.4,
          completionPercent: 35,
        },
      ],
      paymentClaims: [
        {
          claimNumber: 'TM-PC-01',
          phase: 'Phase 1: Mill House & Transformer Salvage Dismantling',
          claimDate: '2026-09-01',
          certifiedDate: '2026-09-12',
          claimedAmount: 1470000,
          certifiedAmount: 1470000,
          certifiedBy: 'M. Botha (Tau Mine Resident Engineer)',
          status: 'certified',
        },
        {
          claimNumber: 'TM-PC-02',
          phase: 'Phase 2: Heavy Machine Foundation Slab Excavation',
          claimDate: '2026-10-15',
          certifiedDate: '2026-10-22',
          claimedAmount: 1470000,
          certifiedAmount: 1470000,
          certifiedBy: 'M. Botha (Tau Mine Resident Engineer)',
          status: 'certified',
        },
      ],
      salvageWaybills: [
        {
          waybillNumber: 'WB-TM-26-018',
          dispatchDate: '2026-10-18',
          materialType: 'Structural Steel',
          grossWeightTon: 48.2,
          tareWeightTon: 16.5,
          netWeightTon: 31.7,
          unitRate: 2500,
          totalCreditValue: 79250,
          transporterName: 'Free State Scrap Haulers',
          vehicleRegistration: 'FS-99-HL-GP',
          driverSignature: 'K. Nkosi (DigiSign #KN-4431)',
          storageOfficerSignature: 'D. Venter (DigiSign #SO-8821)',
          weighbridgeSlipNumber: 'WB-SLIP-7712',
          dwellCheckMinutes: 2.5,
          status: 'reconciled',
        },
        {
          waybillNumber: 'WB-TM-26-019',
          dispatchDate: '2026-10-25',
          materialType: 'Copper Cable',
          grossWeightTon: 11.4,
          tareWeightTon: 6.2,
          netWeightTon: 5.2,
          unitRate: 11500,
          totalCreditValue: 59800,
          transporterName: 'SecuriTrack Special Cargo',
          vehicleRegistration: 'CZ-31-JH-GP',
          driverSignature: 'S. Zulu (DigiSign #SZ-1108)',
          storageOfficerSignature: 'D. Venter (DigiSign #SO-8821)',
          weighbridgeSlipNumber: 'WB-SLIP-7719',
          dwellCheckMinutes: 2.8,
          status: 'reconciled',
        },
      ],
      complianceAudits: [
        {
          permitNumber: 'DMRE-FS-2025-112',
          authority: 'DMRE Free State Region',
          certificateType: 'Environmental Rehabilitation Plan Authorisation',
          status: 'compliant',
          inspectionScore: 94,
          lastInspectedDate: '2026-10-05',
          notes: 'Tailings runoff sedimentation controls fully compliant. Slag barrier intact.',
        },
      ],
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
      boqLineItems: [
        {
          section: 'Section 1: Residential Quarters Asbestos Roof Safe Removal',
          description: 'Controlled stripping and double-bagging of 64 legacy township residential asbestos corrugated sheets',
          estimatedCost: 741000,
          contractValue: 950000,
          marginPercent: 22.0,
          completionPercent: 90,
        },
        {
          section: 'Section 2: Masonry Demolition & Timber Salvage',
          description: 'Bulldozer knocking down of condemned brick units and sorting of reusable salvage timber',
          estimatedCost: 936000,
          contractValue: 1200000,
          marginPercent: 22.0,
          completionPercent: 15,
        },
        {
          section: 'Section 3: Community Greenbelt Topsoil & Landscaping',
          description: 'Deep ripping, organic compost blending, and indigenous tree planting for public park handover',
          estimatedCost: 780000,
          contractValue: 1000000,
          marginPercent: 22.0,
          completionPercent: 0,
        },
      ],
      paymentClaims: [
        {
          claimNumber: 'MV-PC-01',
          phase: 'Phase 1: Asbestos Stripping & Township Clearance Initial Milestone',
          claimDate: '2026-10-11',
          certifiedDate: '2026-10-20',
          claimedAmount: 945000,
          certifiedAmount: 945000,
          certifiedBy: 'T. Radebe (Provincial Mining Inspectorate)',
          status: 'certified',
        },
      ],
      salvageWaybills: [
        {
          waybillNumber: 'WB-MV-26-007',
          dispatchDate: '2026-10-22',
          materialType: 'Structural Steel',
          grossWeightTon: 32.1,
          tareWeightTon: 14.1,
          netWeightTon: 18.0,
          unitRate: 2500,
          totalCreditValue: 45000,
          transporterName: 'Welkom Local Cartage Co-op',
          vehicleRegistration: 'FS-12-RT-GP',
          driverSignature: 'B. Sithole (DigiSign #BS-7711)',
          storageOfficerSignature: 'L. Mokoena (DigiSign #SO-3319)',
          weighbridgeSlipNumber: 'WB-SLIP-4402',
          dwellCheckMinutes: 2.1,
          status: 'reconciled',
        },
      ],
      complianceAudits: [
        {
          permitNumber: 'FS-HAZ-2026-042',
          authority: 'Matjhabeng Local Municipality Environmental Health',
          certificateType: 'Township Hazardous Asbestos Transit Clearance',
          status: 'compliant',
          inspectionScore: 96,
          lastInspectedDate: '2026-10-14',
          notes: 'Air monitoring stations positioned at village perimeter confirmed 0.00 fibers/ml ambient air.',
        },
      ],
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
  // =========================================================================
  // JOB CARD & PURCHASE ORDER TRACEABILITY METHODS
  // =========================================================================

  private createDefaultJobCardDetails(order: EngineeringOrderRecord): JobCardDetail {
    const totalMat = order.materialsCost || 0;
    const totalLabHours = order.labourHours || 0;
    const totalLabCost = order.labourCost || totalLabHours * 350;
    const directCost = totalMat + totalLabCost;
    const val = order.value || 0;
    const profit = Math.max(0, val - directCost);
    const margin = val > 0 ? Number(((profit / val) * 100).toFixed(1)) : 0;

    return {
      id: order.jobCardNumber,
      jobCardNumber: order.jobCardNumber,
      purchaseOrderNumber: order.poNumber,
      client: order.client,
      quoteNumber: order.quoteNumber,
      invoiceNumber: order.invoiceNumber,
      scopeDescription: order.scopeDescription,
      workshop: order.workshop,
      assignedSupervisor: 'Workshop Supervisor',
      dateIssued: new Date().toISOString().slice(0, 10),
      targetDeliveryDate: order.deliveryDate,
      status: order.status,
      materials: [],
      labour: [],
      totalMaterialsCost: totalMat,
      totalLabourHours: totalLabHours,
      totalLabourCost: totalLabCost,
      totalDirectCost: directCost,
      linkedPoValue: val,
      recognizedProfit: profit,
      marginPercent: margin,
    };
  }

  private recalculateEngineeringTotals(): void {
    const orders = this.engineeringOrders();
    const totalRev = orders.reduce((sum, o) => sum + o.value, 0);
    const totalMat = orders.reduce((sum, o) => sum + o.materialsCost, 0);
    const totalLab = orders.reduce((sum, o) => sum + (o.labourCost || o.labourHours * 350), 0);

    this.engineeringRevenue.set(totalRev);
    this.engineeringMaterials.set(totalMat);
    this.engineeringLabour.set(totalLab);
  }

  addMaterialToJobCard(
    jobCardNumber: string,
    material: Omit<JobCardMaterialItem, 'id' | 'totalCost'>
  ): void {
    const totalCost = Number((material.quantity * material.unitRate).toFixed(2));
    const newItem: JobCardMaterialItem = {
      ...material,
      id: 'MAT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      totalCost,
    };

    this.engineeringOrders.update((orders) =>
      orders.map((order) => {
        if (order.jobCardNumber !== jobCardNumber) return order;
        const details = order.jobCardDetails || this.createDefaultJobCardDetails(order);
        const updatedMaterials = [...details.materials, newItem];
        const totalMaterialsCost = updatedMaterials.reduce((sum, m) => sum + m.totalCost, 0);
        const totalDirectCost = totalMaterialsCost + details.totalLabourCost;
        const recognizedProfit = details.linkedPoValue - totalDirectCost;
        const marginPercent =
          details.linkedPoValue > 0
            ? Number(((recognizedProfit / details.linkedPoValue) * 100).toFixed(1))
            : 0;

        const updatedDetails: JobCardDetail = {
          ...details,
          materials: updatedMaterials,
          totalMaterialsCost,
          totalDirectCost,
          recognizedProfit,
          marginPercent,
        };

        return {
          ...order,
          materialsCost: totalMaterialsCost,
          jobCardDetails: updatedDetails,
        };
      })
    );
    this.recalculateEngineeringTotals();
    this.persistToStorage();
  }

  removeMaterialFromJobCard(jobCardNumber: string, materialId: string): void {
    this.engineeringOrders.update((orders) =>
      orders.map((order) => {
        if (order.jobCardNumber !== jobCardNumber) return order;
        const details = order.jobCardDetails || this.createDefaultJobCardDetails(order);
        const updatedMaterials = details.materials.filter((m) => m.id !== materialId);
        const totalMaterialsCost = updatedMaterials.reduce((sum, m) => sum + m.totalCost, 0);
        const totalDirectCost = totalMaterialsCost + details.totalLabourCost;
        const recognizedProfit = details.linkedPoValue - totalDirectCost;
        const marginPercent =
          details.linkedPoValue > 0
            ? Number(((recognizedProfit / details.linkedPoValue) * 100).toFixed(1))
            : 0;

        const updatedDetails: JobCardDetail = {
          ...details,
          materials: updatedMaterials,
          totalMaterialsCost,
          totalDirectCost,
          recognizedProfit,
          marginPercent,
        };

        return {
          ...order,
          materialsCost: totalMaterialsCost,
          jobCardDetails: updatedDetails,
        };
      })
    );
    this.recalculateEngineeringTotals();
    this.persistToStorage();
  }

  addLabourToJobCard(
    jobCardNumber: string,
    labour: Omit<JobCardLabourItem, 'id' | 'totalLabourCost'>
  ): void {
    const totalLabourCost = Number((labour.hoursWorked * labour.hourlyRate).toFixed(2));
    const newItem: JobCardLabourItem = {
      ...labour,
      id: 'LAB-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      totalLabourCost,
    };

    this.engineeringOrders.update((orders) =>
      orders.map((order) => {
        if (order.jobCardNumber !== jobCardNumber) return order;
        const details = order.jobCardDetails || this.createDefaultJobCardDetails(order);
        const updatedLabour = [...details.labour, newItem];
        const totalLabourHours = updatedLabour.reduce((sum, l) => sum + l.hoursWorked, 0);
        const totalLabourCost = updatedLabour.reduce((sum, l) => sum + l.totalLabourCost, 0);
        const totalDirectCost = details.totalMaterialsCost + totalLabourCost;
        const recognizedProfit = details.linkedPoValue - totalDirectCost;
        const marginPercent =
          details.linkedPoValue > 0
            ? Number(((recognizedProfit / details.linkedPoValue) * 100).toFixed(1))
            : 0;

        const updatedDetails: JobCardDetail = {
          ...details,
          labour: updatedLabour,
          totalLabourHours,
          totalLabourCost,
          totalDirectCost,
          recognizedProfit,
          marginPercent,
        };

        return {
          ...order,
          labourHours: totalLabourHours,
          labourCost: totalLabourCost,
          jobCardDetails: updatedDetails,
        };
      })
    );
    this.recalculateEngineeringTotals();
    this.persistToStorage();
  }

  removeLabourFromJobCard(jobCardNumber: string, labourId: string): void {
    this.engineeringOrders.update((orders) =>
      orders.map((order) => {
        if (order.jobCardNumber !== jobCardNumber) return order;
        const details = order.jobCardDetails || this.createDefaultJobCardDetails(order);
        const updatedLabour = details.labour.filter((l) => l.id !== labourId);
        const totalLabourHours = updatedLabour.reduce((sum, l) => sum + l.hoursWorked, 0);
        const totalLabourCost = updatedLabour.reduce((sum, l) => sum + l.totalLabourCost, 0);
        const totalDirectCost = details.totalMaterialsCost + totalLabourCost;
        const recognizedProfit = details.linkedPoValue - totalDirectCost;
        const marginPercent =
          details.linkedPoValue > 0
            ? Number(((recognizedProfit / details.linkedPoValue) * 100).toFixed(1))
            : 0;

        const updatedDetails: JobCardDetail = {
          ...details,
          labour: updatedLabour,
          totalLabourHours,
          totalLabourCost,
          totalDirectCost,
          recognizedProfit,
          marginPercent,
        };

        return {
          ...order,
          labourHours: totalLabourHours,
          labourCost: totalLabourCost,
          jobCardDetails: updatedDetails,
        };
      })
    );
    this.recalculateEngineeringTotals();
    this.persistToStorage();
  }

  updateJobCardDetails(updated: JobCardDetail): void {
    this.engineeringOrders.update((orders) =>
      orders.map((order) => {
        if (order.jobCardNumber !== updated.jobCardNumber) return order;
        return {
          ...order,
          poNumber: updated.purchaseOrderNumber,
          client: updated.client,
          scopeDescription: updated.scopeDescription,
          workshop: updated.workshop,
          deliveryDate: updated.targetDeliveryDate,
          materialsCost: updated.totalMaterialsCost,
          labourHours: updated.totalLabourHours,
          labourCost: updated.totalLabourCost,
          value: updated.linkedPoValue,
          jobCardDetails: updated,
        };
      })
    );
    this.recalculateEngineeringTotals();
    this.persistToStorage();
  }

  createJobCard(data: Partial<EngineeringOrderRecord>): EngineeringOrderRecord {
    const jobCardNum = data.jobCardNumber || ('JC-ENG-' + Math.floor(215 + Math.random() * 50));
    const poNum = data.poNumber || ('HAR-PO-2026-' + Math.floor(8850 + Math.random() * 100));
    const val = data.value || 500000;

    const newOrder: EngineeringOrderRecord = {
      id: 'EOR-' + Math.floor(105 + Math.random() * 50),
      poNumber: poNum,
      client: data.client || 'Harmony Gold Mining Co.',
      quoteNumber: data.quoteNumber || ('QUO-26-' + Math.floor(960 + Math.random() * 40)),
      invoiceNumber: data.invoiceNumber || 'INV-PENDING',
      jobCardNumber: jobCardNum,
      scopeDescription: data.scopeDescription || 'New engineering fabrication scope',
      status: (data.status as any) || 'in_progress',
      value: val,
      materialsCost: 0,
      labourHours: 0,
      labourCost: 0,
      workshop: data.workshop || 'Workshop 1 (Boilermaking)',
      deliveryDate: data.deliveryDate || '2026-12-15',
    };

    newOrder.jobCardDetails = {
      id: jobCardNum,
      jobCardNumber: jobCardNum,
      purchaseOrderNumber: poNum,
      client: newOrder.client,
      quoteNumber: newOrder.quoteNumber,
      invoiceNumber: newOrder.invoiceNumber,
      scopeDescription: newOrder.scopeDescription,
      workshop: newOrder.workshop,
      assignedSupervisor: 'Senior Workshop Lead',
      dateIssued: new Date().toISOString().slice(0, 10),
      targetDeliveryDate: newOrder.deliveryDate,
      status: newOrder.status,
      materials: [],
      labour: [],
      totalMaterialsCost: 0,
      totalLabourHours: 0,
      totalLabourCost: 0,
      totalDirectCost: 0,
      linkedPoValue: val,
      recognizedProfit: val,
      marginPercent: 100,
    };

    this.engineeringOrders.update((orders) => [newOrder, ...orders]);
    this.recalculateEngineeringTotals();
    this.persistToStorage();
    return newOrder;
  }

}
