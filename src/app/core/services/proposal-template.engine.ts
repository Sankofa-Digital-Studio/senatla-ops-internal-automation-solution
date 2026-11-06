/** Layout-only proposal templates. Archived quantities and prices are never loaded. */
export type ProposalTemplateId = 'west-gold' | 'tau-mine' | 'villages' | 'asbestos' | 'civil-boq' | 'cost-breakdown' | 'blank';

export interface ProposalLine {
  id: string;
  itemNo: string;
  description: string;
  uom: string;
  quantity: number | null;
  rate: number | null;
}

export interface ProposalSection {
  id: string;
  title: string;
  lines: ProposalLine[];
}

export interface ProposalDocument {
  templateId: ProposalTemplateId;
  templateName: string;
  projectName: string;
  clientName: string;
  contractRef: string;
  durationMonths: number | null;
  pgPct: number;
  contingencyPct: number;
  profitPct: number;
  vatPct: number;
  sections: ProposalSection[];
}

export interface ProposalSummary {
  sectionTotals: Record<string, number>;
  directSpend: number;
  pgAmount: number;
  subtotalBeforeContingency: number;
  contingencyAmount: number;
  projectCost: number;
  profitAmount: number;
  tenderExclVat: number;
  vatAmount: number;
  tenderInclVat: number;
  pricedLines: number;
  unpricedLines: number;
}

interface LayoutSection { title: string; lines: [string, string][] }
interface Layout { id: ProposalTemplateId; name: string; project: string; sections: LayoutSection[]; source: string }

const section = (title: string, ...lines: [string, string][]): LayoutSection => ({ title, lines });

export const PROPOSAL_LAYOUTS: Layout[] = [
  {
    id: 'west-gold', name: 'West Gold phase schedule', project: 'West Gold Plant Demolition and Rehabilitation',
    source: 'Existing West Gold workspace phase structure; archive cost breakdown and schedule-of-rates layout',
    sections: [
      section('Mobilisation and site establishment', ['Site establishment', 'lot'], ['Site facilities and safety', 'lot']),
      section('Plant demolition', ['Structures to dismantle', 'structure'], ['Concrete breakup', 'm³']),
      section('Rubble and rehabilitation', ['Rubble loading and haulage', 'ton'], ['Shaping and levelling', 'm²']),
    ],
  },
  {
    id: 'tau-mine', name: 'Tau Mine phase schedule', project: 'Tau Mine Demolition and Shaft Backfilling',
    source: 'Existing Tau Mine workspace phase structure; archive sectioned BOQ layout',
    sections: [
      section('Mobilisation and preliminaries', ['Site establishment', 'lot'], ['Safety and environmental controls', 'lot']),
      section('Surface infrastructure', ['Buildings and structures', 'structure'], ['Concrete and foundations', 'm³']),
      section('Shafts and headgears', ['Headgear dismantling', 'structure'], ['Shaft backfilling', 'm³']),
      section('Dams and rehabilitation', ['Dam works', 'lot'], ['Final shaping and rehabilitation', 'm²']),
    ],
  },
  {
    id: 'villages', name: 'Village quotation', project: 'Village Demolition and Rubble Haulage',
    source: 'Demo_Rehab_Quote village grouping and UOM columns; no historical quantities or rates',
    sections: ['Boiketlong', 'Polokong', 'Woolaways', 'Jabulani', 'Pabalong'].map(name =>
      section(`${name} Village`, ['Site establishment', 'lot'], ['Demolition of structures', 'structure'], ['Rubble loading and haulage', 'ton'])),
  },
  {
    id: 'asbestos', name: 'Asbestos schedule of rates', project: 'Asbestos Removal and Site Rehabilitation',
    source: 'Mine Village Houses Schedule of Rates categories; no historical quantities or rates',
    sections: [
      section('Preliminaries', ['Site establishment', 'lot'], ['Work plan and monitoring', 'lot']),
      section('Asbestos works', ['Asbestos removal, packing, transport and disposal', 'ton']),
      section('Clean rubble', ['Clean rubble loading and haulage', 'ton']),
    ],
  },
  {
    id: 'civil-boq', name: 'Civil works bill of quantities', project: 'Civil Works Proposal',
    source: 'JOEL Level Dam BOQ section and item-number layout; no historical quantities or rates',
    sections: [
      section('Preliminaries and general', ['Site establishment and contract conditions', 'sum'], ['Health and safety requirements', 'sum']),
      section('Earthworks', ['Excavation', 'm³'], ['Backfill and compaction', 'm³']),
      section('Concrete and reinforcement', ['Concrete works', 'm³'], ['Reinforcement', 'ton'], ['Rock anchors', 'each']),
    ],
  },
  {
    id: 'cost-breakdown', name: 'Detailed cost breakdown', project: 'Detailed Cost Breakdown',
    source: 'Senatla Costing Model and hostel schedule-of-rates category layout; no historical quantities or rates',
    sections: [
      section('Labour', ['Demolition crew', 'hour'], ['Supervisor', 'hour']),
      section('Equipment and vehicles', ['Plant hire', 'day'], ['Vehicle hire', 'day']),
      section('Consumables and materials', ['Consumables', 'lot'], ['Materials', 'lot']),
      section('Site overheads', ['Site facilities', 'lot']),
    ],
  },
  { id: 'blank', name: 'Blank proposal', project: 'New Proposal', source: 'User-created layout', sections: [section('New section', ['New item', 'lot'])] },
];

export function createProposal(templateId: ProposalTemplateId): ProposalDocument {
  const layout = PROPOSAL_LAYOUTS.find(item => item.id === templateId);
  if (!layout) throw new Error('Unknown proposal template.');
  return {
    templateId: layout.id, templateName: layout.name, projectName: layout.project,
    clientName: 'Harmony Gold Mines', contractRef: '', durationMonths: null,
    pgPct: 0, contingencyPct: 0, profitPct: 0, vatPct: 0,
    sections: layout.sections.map((entry, sectionIndex) => ({
      id: `${layout.id}-section-${sectionIndex + 1}`, title: entry.title,
      lines: entry.lines.map(([description, uom], lineIndex) => ({
        id: `${layout.id}-line-${sectionIndex + 1}-${lineIndex + 1}`,
        itemNo: `${sectionIndex + 1}.${lineIndex + 1}`, description, uom, quantity: null, rate: null,
      })),
    })),
  };
}

function validAmount(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

export function lineAmount(line: ProposalLine): number | null {
  if (!validAmount(line.quantity) || !validAmount(line.rate)) return null;
  const amount = line.quantity * line.rate;
  if (!Number.isFinite(amount)) throw new Error('Line amount exceeds the supported range.');
  return amount;
}

export function calculateProposal(proposal: ProposalDocument): ProposalSummary {
  const percentages = [proposal.pgPct, proposal.contingencyPct, proposal.profitPct, proposal.vatPct];
  if (percentages.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error('Percentages must be between 0 and 100.');
  }
  const sectionTotals: Record<string, number> = {};
  let pricedLines = 0;
  let unpricedLines = 0;
  for (const section of proposal.sections) {
    sectionTotals[section.id] = 0;
    for (const line of section.lines) {
      const amount = lineAmount(line);
      if (amount === null) unpricedLines += 1;
      else { sectionTotals[section.id] += amount; pricedLines += 1; }
    }
  }
  const directSpend = Object.values(sectionTotals).reduce((sum, value) => sum + value, 0);
  const pgAmount = directSpend * proposal.pgPct / 100;
  const subtotalBeforeContingency = directSpend + pgAmount;
  const contingencyAmount = subtotalBeforeContingency * proposal.contingencyPct / 100;
  const projectCost = subtotalBeforeContingency + contingencyAmount;
  const profitAmount = projectCost * proposal.profitPct / 100;
  const tenderExclVat = projectCost + profitAmount;
  const vatAmount = tenderExclVat * proposal.vatPct / 100;
  const tenderInclVat = tenderExclVat + vatAmount;
  if (![directSpend, pgAmount, contingencyAmount, projectCost, profitAmount, tenderExclVat, vatAmount, tenderInclVat].every(Number.isFinite)) {
    throw new Error('Proposal total exceeds the supported range.');
  }
  return { sectionTotals, directSpend, pgAmount, subtotalBeforeContingency, contingencyAmount,
    projectCost, profitAmount, tenderExclVat, vatAmount, tenderInclVat, pricedLines, unpricedLines };
}
