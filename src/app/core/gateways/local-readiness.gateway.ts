import { Injectable } from '@angular/core';
import { AccessibleSite, ReadinessGateway, ReadinessOutcome, SiteReadinessRow } from './readiness.gateway';

const POLICY_VERSION = 'senatla-readiness-v1.0.0';

export interface SeededDemoSite extends AccessibleSite {
  evaluationRows: SiteReadinessRow[];
}

export const SEEDED_DEMO_SITES: SeededDemoSite[] = [
  {
    id: 'demo-workshop',
    name: 'Senatla Shaft 1 Workshop',
    location: 'Welkom Free State, Complex 4',
    jobNumber: 'JOB-2026-WEL-01',
    teamName: 'Team Alpha / Shaft Shift 1',
    evaluationRows: [
      {
        entityType: 'site',
        entityId: '00000000-0000-4000-8000-000000000101',
        entityLabel: 'Shaft 1 Safety & Environmental Compliance Checklist',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Pre-shift toolbox safety briefing scheduled and confirmed',
          'Emergency assembly point clear and fire suppression tested',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'employee',
        entityId: '00000000-0000-4000-8000-000000000201',
        entityLabel: 'Johannes Zulu (Safety Rep - EMP-002)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Medical fitness certificate certified fit through Nov 2026',
          'Red-ticket current and verified',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'employee',
        entityId: '00000000-0000-4000-8000-000000000202',
        entityLabel: 'David Botha (Heavy Operator - EMP-003)',
        outcome: 'warning',
        reasonCodes: ['red_ticket_due'],
        correctiveActions: [
          'Red-ticket renewal due in 18 days (Schedule occupational health exam)',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'employee',
        entityId: '00000000-0000-4000-8000-000000000203',
        entityLabel: 'Tshepo Mokoena (General Worker - EMP-001)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Mandatory PPE issued and verified',
          'Mine induction completed',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'asset',
        entityId: '00000000-0000-4000-8000-000000000301',
        entityLabel: 'CAT Front Loader #04 (CA 289-102)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Pre-start inspection checklist verified',
          'Hydraulic pressure test passed',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'asset',
        entityId: '00000000-0000-4000-8000-000000000302',
        entityLabel: 'Toyota Hilux Site Bakkie (FS 743-982)',
        outcome: 'warning',
        reasonCodes: ['asset_licence_due'],
        correctiveActions: [
          'Licence disc renewal due in 22 days (Fleet office notified)',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'demo-plant-b',
    name: 'Harmony Plant B Operations',
    location: 'Virginia Industrial Zone, Free State',
    jobNumber: 'JOB-2026-VIR-02',
    teamName: 'Processing & Mill Crew',
    evaluationRows: [
      {
        entityType: 'site',
        entityId: '00000000-0000-4000-8000-000000000102',
        entityLabel: 'Plant B Chemical & Air Quality Clearance',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Scrubber ventilation operational and within legal tolerances',
          'Eyewash and chemical spill stations inspected',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'employee',
        entityId: '00000000-0000-4000-8000-000000000204',
        entityLabel: 'Michael Khumalo (Driver - EMP-005)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Heavy Vehicle Licence Code 14 with PrDP valid',
          'Hazchem endorsement verified',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'employee',
        entityId: '00000000-0000-4000-8000-000000000205',
        entityLabel: 'Samuel Nkosi (General Worker - EMP-004)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Fit for duty declaration signed',
          'Respirator cartridge check complete',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'asset',
        entityId: '00000000-0000-4000-8000-000000000303',
        entityLabel: 'Bell B30E Articulated Dump Truck (FS 901-234)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Daily brake test and reverse alarm verified',
          'Tyre condition acceptable',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'demo-shaft-4',
    name: 'Senatla Shaft 4 North',
    location: 'Matjhabeng Sector 7',
    jobNumber: 'JOB-2026-MAT-04',
    teamName: 'Extraction & Haulage',
    evaluationRows: [
      {
        entityType: 'site',
        entityId: '00000000-0000-4000-8000-000000000103',
        entityLabel: 'Shaft 4 Winder & Conveyance Certification',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Daily winder rope visual inspection completed',
          'Shaft bell signaling system functional',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'employee',
        entityId: '00000000-0000-4000-8000-000000000206',
        entityLabel: 'Phumzile Dlamini (Winder Engine Driver)',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Certificate of competency verified',
          'Annual audiometry and optometry screening passed',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
      {
        entityType: 'asset',
        entityId: '00000000-0000-4000-8000-000000000304',
        entityLabel: 'Komatsu Underground Drill Rig #02',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [
          'Water scrubber cleaned and filter replaced',
          'Suppression system charged',
        ],
        policyVersion: POLICY_VERSION,
        evaluatedAt: new Date().toISOString(),
      },
    ],
  },
];

const LOCAL_CONFIRMED_SITES_KEY = 'senatla_ops_local_readiness_confirmed_v1';

@Injectable({ providedIn: 'root' })
export class LocalReadinessGateway implements ReadinessGateway {
  private readonly sites: SeededDemoSite[] = SEEDED_DEMO_SITES;

  async loadAccessibleSites(permittedSiteIds: string[]): Promise<AccessibleSite[]> {
    // If no filter or wildcard, return all seeded demo sites
    if (!permittedSiteIds || permittedSiteIds.length === 0) {
      return this.sites.map(({ id, name, location, jobNumber, teamName }) => ({
        id,
        name,
        location,
        jobNumber,
        teamName,
      }));
    }

    // Normalizing permitted IDs (mapping s1 -> demo-workshop, s2 -> demo-plant-b)
    const normalizedPermitted = new Set(
      permittedSiteIds.map((id) => {
        if (id === 's1') return 'demo-workshop';
        if (id === 's2') return 'demo-plant-b';
        return id;
      }),
    );

    const filtered = this.sites.filter(
      (site) => normalizedPermitted.has(site.id) || permittedSiteIds.includes(site.id),
    );

    // If matches were found, return them. Otherwise return all seeded sites so user is never stranded
    const resultSites = filtered.length > 0 ? filtered : this.sites;
    return resultSites.map(({ id, name, location, jobNumber, teamName }) => ({
      id,
      name,
      location,
      jobNumber,
      teamName,
    }));
  }

  async evaluateSite(siteId: string): Promise<SiteReadinessRow[]> {
    const normalizedId = siteId === 's1' ? 'demo-workshop' : siteId === 's2' ? 'demo-plant-b' : siteId;
    const match = this.sites.find((s) => s.id === normalizedId) || this.sites[0];

    // Return fresh timestamped rows
    const now = new Date().toISOString();
    return match.evaluationRows.map((row) => ({
      ...row,
      evaluatedAt: now,
    }));
  }

  async confirmSite(siteId: string): Promise<ReadinessOutcome> {
    const normalizedId = siteId === 's1' ? 'demo-workshop' : siteId === 's2' ? 'demo-plant-b' : siteId;
    const match = this.sites.find((s) => s.id === normalizedId) || this.sites[0];

    try {
      const stored = JSON.parse(sessionStorage.getItem(LOCAL_CONFIRMED_SITES_KEY) || '{}');
      stored[match.id] = {
        confirmedAt: new Date().toISOString(),
        siteName: match.name,
      };
      sessionStorage.setItem(LOCAL_CONFIRMED_SITES_KEY, JSON.stringify(stored));
    } catch {
      // Non-blocking
    }

    const hasBlocked = match.evaluationRows.some((row) => row.outcome === 'blocked');
    const hasWarning = match.evaluationRows.some((row) => row.outcome === 'warning');

    if (hasBlocked) return 'blocked';
    if (hasWarning) return 'warning';
    return 'ready';
  }
}
