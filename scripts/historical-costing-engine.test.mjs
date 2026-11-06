import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESET_SENATLA_VILLAGES,
  HISTORICAL_COST_REFERENCES,
  calculateWaterfall,
  calculateHistoricalKmCost,
  exportModelAsCSV,
} from '../src/app/core/services/costing-model.engine.ts';

test('historical rates remain opt-in and additional spend flows through export', () => {
  const preset = PRESET_SENATLA_VILLAGES;
  const baseline = calculateWaterfall(preset.phases, preset.rates, preset.durationMonths);
  const item = {
    id: 'reviewed-asbestos', category: 'asbestos', description: 'Removal',
    unit: 'ton', quantity: 2, unitRate: 13300, sourceRef: 'reviewed historical cell',
  };
  const changed = calculateWaterfall(preset.phases, preset.rates, preset.durationMonths, [item]);
  assert.equal(baseline.waterfall.additionalDirectSpend, 0);
  assert.equal(changed.waterfall.additionalDirectSpend, 26600);
  assert.equal(changed.waterfall.directSpend - baseline.waterfall.directSpend, 26600);
  assert.ok(changed.waterfall.totalTenderPriceInclVat > baseline.waterfall.totalTenderPriceInclVat);
  const csv = exportModelAsCSV({ ...preset, additionalCosts: [item] }, changed.waterfall, changed.phaseDetails);
  assert.match(csv, /PROVISIONAL - VERIFY CONTRACT PARTY/);
  assert.match(csv, /reviewed historical cell/);
  assert.match(csv, /26600\.00/);
  assert.equal(HISTORICAL_COST_REFERENCES.find(ref => ref.id === 'asbestos-2026').rate, 13300);
});

test('historical transport math and invalid input', () => {
  assert.deepEqual(calculateHistoricalKmCost(12, 2), { ratePerKm: 36, total: 864 });
  assert.throws(() => calculateHistoricalKmCost(-1, 2));
});

test('CSV input cannot become a spreadsheet formula', () => {
  const preset = { ...PRESET_SENATLA_VILLAGES, projectName: '=HYPERLINK("bad")' };
  const result = calculateWaterfall(preset.phases, preset.rates, preset.durationMonths);
  assert.match(exportModelAsCSV(preset, result.waterfall, result.phaseDetails), /"'=HYPERLINK/);
});
