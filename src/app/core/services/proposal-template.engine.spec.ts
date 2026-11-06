import { calculateProposal, createProposal, lineAmount, PROPOSAL_LAYOUTS } from './proposal-template.engine';

describe('Director proposal templates', () => {
  it('starts every format with Harmony as client and no historical quantities or rates', () => {
    for (const layout of PROPOSAL_LAYOUTS) {
      const proposal = createProposal(layout.id);
      expect(proposal.clientName).toBe('Harmony Gold Mines');
      expect(proposal.sections.length).toBeGreaterThan(0);
      expect(proposal.sections.flatMap(section => section.lines).every(line => line.quantity === null && line.rate === null)).toBeTrue();
      expect(calculateProposal(proposal).directSpend).toBe(0);
    }
  });

  it('recalculates section totals and the commercial waterfall from entered values', () => {
    const proposal = createProposal('west-gold');
    proposal.sections[0].lines[0].quantity = 2;
    proposal.sections[0].lines[0].rate = 100;
    proposal.pgPct = 10;
    proposal.contingencyPct = 10;
    proposal.profitPct = 5;
    proposal.vatPct = 15;
    const summary = calculateProposal(proposal);
    expect(summary.sectionTotals[proposal.sections[0].id]).toBe(200);
    expect(summary.directSpend).toBe(200);
    expect(summary.pgAmount).toBe(20);
    expect(summary.contingencyAmount).toBe(22);
    expect(summary.tenderInclVat).toBeCloseTo(292.215, 3);
    expect(summary.unpricedLines).toBeGreaterThan(0);
    proposal.sections.shift();
    expect(calculateProposal(proposal).directSpend).toBe(0);
  });

  it('rejects invalid numeric input', () => {
    const proposal = createProposal('tau-mine');
    proposal.sections[0].lines[0].quantity = -1;
    proposal.sections[0].lines[0].rate = 100;
    expect(lineAmount(proposal.sections[0].lines[0])).toBeNull();
    proposal.pgPct = 101;
    expect(() => calculateProposal(proposal)).toThrow();
  });
});
