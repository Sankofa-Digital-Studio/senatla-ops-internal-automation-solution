import {
  DEFAULT_COSTING_RATES,
  PRESET_SENATLA_VILLAGES,
  calculatePhaseDetail,
  calculateWaterfall,
  generateCashflowSchedule,
  exportModelAsCSV,
  calculateAdditionalCost,
  calculateHistoricalKmCost,
  HISTORICAL_COST_REFERENCES,
} from './costing-model.engine';

describe('CostingModelEngine', () => {
  it('calculates individual phase direct costs with correct formulas', () => {
    const phase = {
      id: 'test-1',
      name: 'Test Zone',
      footprint_m2: 10000,
      structures: 2,
      concrete_m3: 500,
      duration_months: 2,
    };

    const detail = calculatePhaseDetail(phase, DEFAULT_COSTING_RATES);

    // Site est = 35,000
    // Steel = 2 * 21,000 = 42,000
    // Concrete = 500 * 240 = 120,000
    // Rubble = 500 * 2.40 = 1,200 tons * 120 = 144,000
    // Shaping = 10,000 * 18.50 = 185,000
    // Total = 35,000 + 42,000 + 120,000 + 144,000 + 185,000 = 526,000
    expect(detail.estCost).toBe(35000);
    expect(detail.steelCost).toBe(42000);
    expect(detail.concreteCost).toBe(120000);
    expect(detail.haulCost).toBe(144000);
    expect(detail.shapingCost).toBe(185000);
    expect(detail.totalDirect).toBe(526000);
  });

  it('excludes only explicitly inapplicable cost categories', () => {
    const detail = calculatePhaseDetail({
      id: 'selective-scope',
      name: 'Selective Scope',
      footprint_m2: 10000,
      structures: 2,
      concrete_m3: 500,
      duration_months: 2,
      costCategoryApplicability: {
        concreteBreakup: false,
        shapingLevelling: false,
      },
    }, DEFAULT_COSTING_RATES);

    expect(detail.estCost).toBe(35000);
    expect(detail.steelCost).toBe(42000);
    expect(detail.concreteCost).toBe(0);
    expect(detail.haulCost).toBe(144000);
    expect(detail.shapingCost).toBe(0);
    expect(detail.totalDirect).toBe(221000);
  });

  it('preserves the existing 5-Village scenario calculation with no extra costs', () => {
    const { waterfall, phaseDetails } = calculateWaterfall(
      PRESET_SENATLA_VILLAGES.phases,
      PRESET_SENATLA_VILLAGES.rates,
      PRESET_SENATLA_VILLAGES.durationMonths
    );

    expect(phaseDetails.every((phase) => phase.concreteCost === 0)).toBeTrue();
    expect(phaseDetails.every((phase) => phase.shapingCost === 0)).toBeTrue();

    // Direct spend should be R 2,077,960.00
    expect(Math.round(waterfall.directSpend)).toBe(2077960);

    // P&G 10% = R 207,796.00
    expect(Math.round(waterfall.pgAmount)).toBe(207796);

    // Subtotal excl contingencies = R 2,285,756.00
    expect(Math.round(waterfall.subtotalExclContingencies)).toBe(2285756);

    // Contingencies 10% = R 228,575.60
    expect(Math.round(waterfall.contingencyAmount)).toBe(228576);

    // Project Costs A = R 2,514,331.60
    expect(Math.round(waterfall.projectCostsA)).toBe(2514332);

    // Profit 5% = R 125,716.58
    expect(Math.round(waterfall.profitAmount)).toBe(125717);

    // Subtotal B (Tender Price Excl VAT) = R 2,640,048.18
    expect(Math.round(waterfall.tenderPriceExclVat)).toBe(2640048);

    // VAT 15% = R 396,007.23
    expect(Math.round(waterfall.vatAmount)).toBe(396007);

    // Total Project Cost C (Incl VAT) = R 3,036,055.41
    expect(Math.round(waterfall.totalTenderPriceInclVat)).toBe(3036055);
  });

  it('generates cashflow forecast whose sum equals total tender price', () => {
    const { waterfall } = calculateWaterfall(
      PRESET_SENATLA_VILLAGES.phases,
      PRESET_SENATLA_VILLAGES.rates,
      PRESET_SENATLA_VILLAGES.durationMonths
    );

    const schedule = generateCashflowSchedule(waterfall, PRESET_SENATLA_VILLAGES.durationMonths);
    expect(schedule.length).toBe(6);

    const sumCashflow = schedule.reduce((acc, s) => acc + s.spend, 0);
    expect(Math.round(sumCashflow)).toBe(Math.round(waterfall.totalTenderPriceInclVat));
    expect(Math.round(schedule[schedule.length - 1].sCurvePct)).toBe(100);
  });

  it('generates exportable CSV formatted with executive headers', () => {
    const { waterfall, phaseDetails } = calculateWaterfall(
      PRESET_SENATLA_VILLAGES.phases,
      PRESET_SENATLA_VILLAGES.rates,
      PRESET_SENATLA_VILLAGES.durationMonths
    );

    const csv = exportModelAsCSV(PRESET_SENATLA_VILLAGES, waterfall, phaseDetails);
    expect(csv).toContain('SENATLA 5-VILLAGE DEMOLITION & RUBBLE HAULAGE');
    expect(csv).toContain('EXECUTIVE FINANCIAL WATERFALL');
    expect(csv).toContain('MASTER BILL OF QUANTITIES (BOQ) BREAKDOWN');
    expect(csv).toContain('Boiketlong Village');
    expect(csv).toContain('Pabalong Village');
    expect(csv).toContain('PROVISIONAL - VERIFY CONTRACT PARTY');
  });

  it('adds reviewed cost lines to direct spend and downstream totals', () => {
    const item = { id: 'a', category: 'asbestos' as const, description: 'Removal', unit: 'ton', quantity: 2, unitRate: 13300, sourceRef: 'historical example' };
    const baseline = calculateWaterfall(PRESET_SENATLA_VILLAGES.phases, PRESET_SENATLA_VILLAGES.rates, 6);
    const result = calculateWaterfall(PRESET_SENATLA_VILLAGES.phases, PRESET_SENATLA_VILLAGES.rates, 6, [item]);
    expect(calculateAdditionalCost(item)).toBe(26600);
    expect(result.waterfall.phaseDirectSpend).toBe(baseline.waterfall.directSpend);
    expect(result.waterfall.additionalDirectSpend).toBe(26600);
    expect(result.waterfall.directSpend).toBe(baseline.waterfall.directSpend + 26600);
    expect(result.waterfall.totalTenderPriceInclVat).toBeGreaterThan(baseline.waterfall.totalTenderPriceInclVat);
    const csv = exportModelAsCSV({ ...PRESET_SENATLA_VILLAGES, additionalCosts: [item] }, result.waterfall, result.phaseDetails);
    expect(csv).toContain('ADDITIONAL DIRECT COSTS');
    expect(csv).toContain('26600.00');
    expect(csv).toContain('historical example');
  });

  it('rejects invalid costs and keeps historical values outside defaults', () => {
    expect(() => calculateAdditionalCost({ id: 'x', category: 'other', description: 'x', unit: 'lot', quantity: -1, unitRate: 2 })).toThrow();
    expect(() => calculateHistoricalKmCost(10, Number.NaN)).toThrow();
    expect(calculateHistoricalKmCost(12, 2)).toEqual({ ratePerKm: 36, total: 864 });
    expect(PRESET_SENATLA_VILLAGES.additionalCosts).toBeUndefined();
    expect(HISTORICAL_COST_REFERENCES.find(r => r.id === 'asbestos-2026')?.rate).toBe(13300);
  });

  it('escapes spreadsheet formulas in user-supplied CSV text', () => {
    const model = { ...PRESET_SENATLA_VILLAGES, projectName: '=HYPERLINK("bad")', clientName: '+unsafe' };
    const { waterfall, phaseDetails } = calculateWaterfall(model.phases, model.rates, model.durationMonths);
    const csv = exportModelAsCSV(model, waterfall, phaseDetails);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+unsafe");
  });
});
