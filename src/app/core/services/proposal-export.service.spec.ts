import { calculateProposal, createProposal } from './proposal-template.engine';
import { createProposalPdf, createProposalWorkbook, proposalFilename } from './proposal-export.service';

describe('Director proposal downloads', () => {
  const priced = () => {
    const proposal = createProposal('west-gold');
    proposal.sections[0].lines[0].quantity = 2;
    proposal.sections[0].lines[0].rate = 100;
    return proposal;
  };

  it('creates a real Excel workbook from the edited proposal', async () => {
    const proposal = priced();
    const blob = await createProposalWorkbook(proposal, calculateProposal(proposal));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(blob.size).toBeGreaterThan(1000);
    expect(proposalFilename(proposal, 'xlsx')).toContain('.xlsx');
  });

  it('creates an immediate PDF from the same proposal', async () => {
    const proposal = priced();
    const blob = await createProposalPdf(proposal, calculateProposal(proposal));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe('application/pdf');
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
    expect(blob.size).toBeGreaterThan(1000);
  });
});
