import { decodeEmployeeRates, encodeEmployeeRates } from './employee-rate-metadata';

describe('employee rate persistence', () => {
  it('round trips an override without changing unrelated employee fields', () => {
    const employee = { hourlyRate: 180, rateOverride: 205.25, hasRateOverride: true, additionalFields: { certificate: 'A' } };
    const saved = encodeEmployeeRates(employee);
    expect(saved['certificate']).toBe('A');
    expect(decodeEmployeeRates(JSON.parse(JSON.stringify(saved)))).toEqual({ hourlyRate: 180, rateOverride: 205.25, hasRateOverride: true });
    expect(employee.additionalFields).toEqual({ certificate: 'A' });
  });
  it('persists a disabled override and retains metadata for older callers', () => {
    const saved = encodeEmployeeRates({ hourlyRate: 180, rateOverride: 0, hasRateOverride: false });
    expect(decodeEmployeeRates(encodeEmployeeRates({ additionalFields: saved })).hasRateOverride).toBeFalse();
  });
  it('accepts legacy and malformed records without inventing a rate', () => {
    expect(decodeEmployeeRates(null)).toEqual({ hourlyRate: undefined, rateOverride: undefined, hasRateOverride: undefined });
    expect(decodeEmployeeRates({ __senatla_rate_v1: 'broken' })).toEqual({});
    expect(decodeEmployeeRates({ __senatla_rate_v1: '{"hourlyRate":-1,"rateOverride":"200","hasRateOverride":"false"}' })).toEqual({ hourlyRate: undefined, rateOverride: undefined, hasRateOverride: undefined });
  });
});
