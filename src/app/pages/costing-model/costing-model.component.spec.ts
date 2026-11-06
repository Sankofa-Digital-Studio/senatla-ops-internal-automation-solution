import { CostingModelComponent } from './costing-model.component';

describe('Director proposal builder', () => {
  it('lets a Director add and remove priced sections and see the total change', () => {
    const builder = new CostingModelComponent();
    expect(builder.summary().directSpend).toBe(0);
    builder.addSection();
    const section = builder.proposal().sections.at(-1)!;
    builder.updateSection(section.id, 'Custom work');
    builder.updateLineText(section.id, section.lines[0].id, 'description', 'Haulage');
    builder.updateLineText(section.id, section.lines[0].id, 'uom', 'ton');
    builder.updateLineNumber(section.id, section.lines[0].id, 'quantity', 3);
    builder.updateLineNumber(section.id, section.lines[0].id, 'rate', 50);
    expect(builder.summary().sectionTotals[section.id]).toBe(150);
    builder.view.set('preview');
    expect(builder.view()).toBe('preview');
    builder.removeSection(section.id);
    expect(builder.summary().directSpend).toBe(0);
  });

  it('prevents replacement of an edited proposal when the Director cancels', () => {
    const builder = new CostingModelComponent();
    builder.updateText('projectName', 'Edited project');
    spyOn(window, 'confirm').and.returnValue(false);
    builder.loadTemplate('tau-mine');
    expect(builder.proposal().templateId).toBe('west-gold');
    expect(builder.proposal().projectName).toBe('Edited project');
  });
});
