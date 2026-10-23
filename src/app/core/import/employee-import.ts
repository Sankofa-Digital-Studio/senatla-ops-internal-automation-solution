import { Employee } from '../models/app.models';

export type EmployeeImportStatus = 'ready' | 'warning' | 'error';
export interface EmployeeImportRow { sourceRow: number; status: EmployeeImportStatus; employee: Employee; errors: string[]; warnings: string[]; }

const sensitiveHeaderTokens = ['id_number', 'identity', 'tax', 'vat', 'bank', 'account', 'medical', 'phone', 'email', 'address', 'salary', 'wage', 'allowance', 'deduction', 'net_pay'];

/** Stages only payroll-free, masked UAT workforce data. Source IDs are used in memory solely for duplicate detection. */
export function stageEmployeeCsv(text: string, siteId: string, existing: Employee[] = []): EmployeeImportRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('CSV must contain a header and at least one employee row.');
  const headerIndex = lines.findIndex((line) => splitCsv(line).some((value) => normalizeHeader(value) === 'names'));
  if (headerIndex < 0) throw new Error('No employee header row was found. Expected at least Names.');
  const headers = splitCsv(lines[headerIndex]).map(normalizeHeader);
  const disallowedHeader = headers.find((header) => sensitiveHeaderTokens.some((token) => header.includes(token)) && header !== 'id_no');
  if (disallowedHeader) throw new Error(`CSV contains a disallowed sensitive column: ${disallowedHeader}.`);
  const seenSourceIds = new Set<string>();
  const seenCompanyNumbers = new Set(existing.map((employee) => normalizeCompanyNumber(employee.companyNumber)).filter(isPresent));
  let nextReference = nextUatReference(existing);

  return lines.slice(headerIndex + 1).map((line, index) => ({ values: splitCsv(line), sourceRow: headerIndex + index + 2 }))
    .filter(({ values }) => !isRepeatedHeader(values))
    .map(({ values, sourceRow }) => {
      const raw = mapRow(headers, values);
      const errors: string[] = [];
      const warnings: string[] = [];
      const { firstName, surname } = splitName(raw['names'] || '');
      const sourceId = digits(raw['id_no'] || '');
      const companyNumber = (raw['company_no'] || '').trim();
      const normalizedCompanyNumber = normalizeCompanyNumber(companyNumber);
      const designation = (raw['designation'] || '').trim();
      const startDate = normalizeDate(raw['emp_start_date'] || '');
      if (!firstName || !surname) errors.push('A first name and surname are required.');
      if (sourceId && seenSourceIds.has(sourceId)) errors.push('Source identifier duplicates another staged employee.');
      if (!sourceId) warnings.push('No source identifier supplied; reviewer verification is required.');
      if (!companyNumber) warnings.push('Company number is missing.');
      else if (seenCompanyNumbers.has(normalizedCompanyNumber)) errors.push('Company number duplicates an existing or staged employee.');
      if (!designation) warnings.push('Designation is missing.');
      if (!startDate) errors.push('Employee start date is invalid or missing.');
      if (!siteId) errors.push('Select a site before importing.');
      if (sourceId) seenSourceIds.add(sourceId);
      if (normalizedCompanyNumber) seenCompanyNumbers.add(normalizedCompanyNumber);
      const employee: Employee = {
        id: '', firstName, surname, idNumber: `UAT-EMP-${String(nextReference++).padStart(4, '0')}`,
        companyNumber: companyNumber || undefined, role: categoryForDesignation(designation), designation: designation || undefined,
        siteId, startDate: startDate || '', basicRate: 0, payRateUnit: 'daily',
        safetyQualifications: splitQualifications(raw['xtream_safety'] || ''), additionalFields: collectSafeAdditionalFields(raw),
        salaryAdvances: 0, financials: { travel: 0, housing: 0, advance: 0 }, logs: {}, adjustments: {},
        employmentStatus: normalizeEmploymentStatus(raw['employment_status']),
      };
      return { sourceRow, status: errors.length ? 'error' : warnings.length ? 'warning' : 'ready', employee, errors, warnings };
    });
}

function nextUatReference(existing: Employee[]) { const values = existing.map((employee) => employee.idNumber.match(/^UAT-EMP-(\d+)$/i)?.[1]).filter(isPresent).map(Number); return Math.max(0, ...values) + 1; }
function mapRow(headers: string[], values: string[]) { const raw: Record<string, string> = {}; headers.forEach((header, column) => { if (header) raw[header] = (values[column] || '').trim(); }); return raw; }
function collectSafeAdditionalFields(raw: Record<string, string>) { const fields: Record<string, string> = {}; if (raw['source_reference']) fields['source_reference'] = raw['source_reference']; return fields; }
function splitCsv(line: string) { const values: string[] = []; let value = ''; let quoted = false; for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { values.push(value.trim()); value = ''; } else value += char; } values.push(value.trim()); return values; }
function normalizeHeader(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function isRepeatedHeader(values: string[]) { return values.some((value) => normalizeHeader(value) === 'names') && values.some((value) => normalizeHeader(value) === 'designation'); }
function digits(value: string) { return value.replace(/\D/g, ''); }
function normalizeCompanyNumber(value: string | undefined) { return value?.trim().toLowerCase() || ''; }
function isPresent<T>(value: T | null | undefined | ''): value is T { return Boolean(value); }
function splitName(value: string) { const parts = value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean); return { firstName: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] || '' }; }
function normalizeDate(value: string) { const text = value.trim(); if (!text) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text; const match = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`; const serial = Number(text); if (Number.isInteger(serial) && serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30 + serial)).toISOString().slice(0, 10); return null; }
function splitQualifications(value: string) { return value.split(/[.,;]+/).map((item) => item.trim()).filter((item) => item && item !== '-'); }
function normalizeEmploymentStatus(value: string | undefined): Employee['employmentStatus'] { const normalized = value?.trim().toLowerCase(); return normalized === 'inactive' || normalized === 'suspended' ? normalized : 'active'; }
function categoryForDesignation(value: string): Employee['role'] { const role = value.toLowerCase(); if (/safety|hse|she\b/.test(role)) return 'Safety Rep'; if (/operator|excavator|loader|truck|driver/.test(role)) return 'Operator'; if (/foreman|supervisor|manager|leader/.test(role)) return 'Foreman'; return 'General Worker'; }