import { Employee } from './app.models';

const RATE_KEY = '__senatla_rate_v1';
type RateFields = Pick<Employee, 'hourlyRate' | 'rateOverride' | 'hasRateOverride'>;

/** Preserve rate settings in the existing employee JSON field across database reloads. */
export function encodeEmployeeRates(employee: RateFields & Pick<Employee, 'additionalFields'>): Record<string, string> {
  const fields = { ...employee.additionalFields };
  if (employee.hourlyRate !== undefined || employee.rateOverride !== undefined || employee.hasRateOverride !== undefined) {
    fields[RATE_KEY] = JSON.stringify({
      hourlyRate: employee.hourlyRate,
      rateOverride: employee.rateOverride,
      hasRateOverride: employee.hasRateOverride,
    });
  }
  return fields;
}

export function decodeEmployeeRates(fields: Record<string, string> | null | undefined): RateFields {
  try {
    const value = JSON.parse(fields?.[RATE_KEY] || '{}');
    if (!value || typeof value !== 'object') return {};
    const finiteRate = (rate: unknown) => typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? rate : undefined;
    return {
      hourlyRate: finiteRate(value.hourlyRate),
      rateOverride: finiteRate(value.rateOverride),
      hasRateOverride: typeof value.hasRateOverride === 'boolean' ? value.hasRateOverride : undefined,
    };
  } catch { return {}; }
}
