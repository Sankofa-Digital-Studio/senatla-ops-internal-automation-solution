import { AssetEvidenceType } from '../models/app.models';

export interface ExtractedAssetFields {
  registrationNumber?: string;
  vin?: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  licenseExpiry?: string;
  engineNumber?: string;
  [key: string]: string | undefined;
}

export interface OcrQualityAssessment {
  overallConfidence: number;
  fieldCompleteness: number;
  requiresCloudEnhance: boolean;
  missingFields: string[];
  reasons: string[];
  suggestedAction: 'direct_review' | 'cloud_enhance_recommended';
}

const CANONICAL_MAKES = [
  'Caterpillar', 'CAT', 'Komatsu', 'Hitachi', 'Volvo', 'Bell', 'JCB', 'Liebherr',
  'Toyota', 'Isuzu', 'Ford', 'Nissan', 'Scania', 'Mercedes-Benz', 'MAN', 'Hino',
  'Volkswagen', 'Mitsubishi', 'Hyundai', 'Case', 'Deere', 'Bobcat', 'Doosan',
];

const ISO_VIN_CHARACTERS = /^[A-HJ-NPR-Z0-9]{17}$/i;

/**
 * Normalizes South African dates to canonical YYYY-MM-DD.
 * Supports ISO (2026-12-31), Slash (31/12/2026 or 2026/12/31),
 * Dot (31.12.2026), and text months (31 Dec 2026 / 31-Dec-2026).
 */
export function normalizeDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmMatch = trimmed.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dmMatch) {
    const [, day, month, year] = dmMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD MMM YYYY (e.g. 31 Jan 2027)
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const textMonthMatch = trimmed.match(/\b(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]+(20\d{2})\b/);
  if (textMonthMatch) {
    const [, day, monthText, year] = textMonthMatch;
    const monthIndex = monthNames.findIndex((name) => monthText.toLowerCase().startsWith(name));
    if (monthIndex !== -1) {
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      return `${year}-${monthStr}-${day.padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Normalizes VIN strings, filtering illegal characters (I, O, Q) per ISO 3779.
 */
export function normalizeVin(value?: string | null): string | undefined {
  if (!value) return undefined;
  let cleaned = value.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
  if (cleaned.length === 17 && ISO_VIN_CHARACTERS.test(cleaned)) {
    return cleaned;
  }
  return undefined;
}

/**
 * Normalizes South African vehicle registration plates (e.g. CA 123-456, AB 12 CD GP).
 */
export function normalizeRegistrationNumber(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ').toUpperCase();
  // Standard SA provincial or regional plate format pattern
  const zaPlatePattern = /^(?:[A-Z]{1,3}\s*\d{1,6}(?:[- ]*[A-Z]{1,3})?|[A-Z]{2}\s*\d{2}\s*[A-Z]{2}\s*(?:GP|NW|MP|FS|L|NC|EC|WP|KZN|ZN)|[A-Z0-9-]{3,10})$/i;
  if (zaPlatePattern.test(cleaned) && cleaned.length >= 3 && cleaned.length <= 12) {
    return cleaned;
  }
  return cleaned || undefined;
}

/**
 * Parses raw document text using South African Natis disc and invoice patterns.
 */
export function extractStructuredFields(rawText: string): ExtractedAssetFields {
  if (!rawText || !rawText.trim()) return {};
  const trimmed = rawText.trim();
  const fields: ExtractedAssetFields = {};

  // Try JSON first (if structured from Gemini or browser detector)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const getStr = (keys: string[]) => {
        const found = keys.find((k) => typeof parsed[k] === 'string' && parsed[k]);
        return found ? String(parsed[found]).trim() : undefined;
      };
      fields.registrationNumber = normalizeRegistrationNumber(getStr(['registrationNumber', 'registration', 'plate', 'licenceNumber', 'licenseNumber']));
      fields.vin = normalizeVin(getStr(['vin', 'chassisNumber', 'vehicleIdentifier']));
      fields.serialNumber = getStr(['serialNumber', 'serial', 'assetIdentifier', 'assetId']);
      fields.make = getStr(['make', 'manufacturer']);
      fields.model = getStr(['model', 'seriesName']);
      fields.licenseExpiry = normalizeDate(getStr(['licenseExpiry', 'licenceExpiry', 'expiryDate']));
      fields.engineNumber = getStr(['engineNumber', 'engineNo']);
      return filterEmptyFields(fields);
    } catch {
      // Fall through to regex extraction
    }
  }

  // Regex extraction across document lines
  const findValue = (labelPattern: string) => {
    const regex = new RegExp(`(?:${labelPattern})\\s*[:=-]\\s*([^\\n;|]+)`, 'i');
    return trimmed.match(regex)?.[1]?.trim();
  };

  // 1. South African Vehicle Licence Disc (Natis) or Registration Certificate
  const regNumber = findValue('(?:licen[cs]e\\s*(?:no\\.?|number)?|registration\\s*(?:no\\.?|number)?|number\\s*plate|reg\\b|plate\\b)')
    || trimmed.match(/\b([A-Z]{1,3}\s*\d{1,6}(?:-\d{1,6})?|[A-Z]{1,3}\s*\d{1,6}(?:-[A-Z]{1,3})?|[A-Z]{2}\s*\d{2}\s*[A-Z]{2}\s*GP)\b/i)?.[0];
  if (regNumber) fields.registrationNumber = normalizeRegistrationNumber(regNumber);

  // 2. VIN / Chassis Number
  const vinCandidate = findValue('(?:vehicle\\s*identifier(?:\\s*\\(vin\\))?|chassis\\s*(?:no\\.?|number)?|chassis\\b|vin\\b)')
    || trimmed.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0];
  if (vinCandidate) fields.vin = normalizeVin(vinCandidate);

  // 3. Engine Number
  const engineCandidate = findValue('(?:engine\\s*(?:no\\.?|number)?)');
  if (engineCandidate) fields.engineNumber = engineCandidate.replace(/\s+/g, '').toUpperCase();

  // 4. Make / Manufacturer
  const explicitMake = findValue('(?:make|manufacturer)');
  if (explicitMake) {
    fields.make = canonicalizeMake(explicitMake);
  } else {
    // Scan for known equipment / vehicle makes in text
    for (const make of CANONICAL_MAKES) {
      if (new RegExp(`\\b${make}\\b`, 'i').test(trimmed)) {
        fields.make = make === 'CAT' ? 'Caterpillar' : make;
        break;
      }
    }
  }

  // 5. Model / Series
  const explicitModel = findValue('(?:series\\s*name|series|model)');
  if (explicitModel) fields.model = explicitModel.replace(/\s+/g, ' ').trim();

  // 6. Expiry Date
  const expiryRaw = findValue('(?:date\\s*of\\s*expiry|licen[cs]e\\s*expiry|expiry\\s*date|expires|expiry)')
    || trimmed.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/)?.[0];
  if (expiryRaw) fields.licenseExpiry = normalizeDate(expiryRaw);

  // 7. Serial Number (Yellow metal / plant equipment)
  const explicitSerial = findValue('(?:serial\\s*(?:no\\.?|number)?|asset\\s*(?:id|identifier|number))');
  if (explicitSerial) {
    fields.serialNumber = explicitSerial.trim().toUpperCase();
  } else {
    fields.serialNumber = inferSerialNumber(trimmed, fields.registrationNumber, fields.vin);
  }

  return filterEmptyFields(fields);
}

function canonicalizeMake(makeInput: string): string {
  const trimmed = makeInput.trim();
  const matched = CANONICAL_MAKES.find((m) => m.toLowerCase() === trimmed.toLowerCase());
  if (matched) return matched === 'CAT' ? 'Caterpillar' : matched;
  return trimmed;
}

function filterEmptyFields(fields: ExtractedAssetFields): ExtractedAssetFields {
  const result: ExtractedAssetFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value && typeof value === 'string' && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

function inferSerialNumber(raw: string, regNumber?: string, vin?: string): string | undefined {
  const candidates = raw.match(/\b[A-Z0-9][A-Z0-9-]{5,24}\b/gi) || [];
  const normalizedReg = regNumber?.toUpperCase().replace(/\s+/g, '');
  const normalizedVin = vin?.toUpperCase();

  return candidates
    .map((c) => c.trim().toUpperCase())
    .find((c) => {
      const normalizedC = c.replace(/\s+/g, '');
      return normalizedC !== normalizedReg
        && normalizedC !== normalizedVin
        && !/^20\d{2}/.test(c)
        && !/^(?:SOUTH|AFRICA|LICENCE|DEPARTMENT|TRANSPORT)$/i.test(c);
    });
}

/**
 * Evaluates the extraction quality and decides whether cloud multimodal enhancement is recommended.
 */
export function evaluateOcrQuality(
  fields: ExtractedAssetFields,
  evidenceType: AssetEvidenceType,
  nativeConfidence: number | null,
): OcrQualityAssessment {
  const missing: string[] = [];
  const reasons: string[] = [];

  // Determine required fields based on evidence type
  switch (evidenceType) {
    case 'licence_disc':
    case 'registration_document':
      if (!fields.vin || !ISO_VIN_CHARACTERS.test(fields.vin)) missing.push('17-character VIN');
      if (!fields.registrationNumber) missing.push('Registration number');
      if (!fields.licenseExpiry) missing.push('License expiry date');
      break;
    case 'number_plate':
      if (!fields.registrationNumber) missing.push('Registration number');
      break;
    case 'purchase_invoice':
      if (!fields.serialNumber && !fields.vin && !fields.registrationNumber) {
        missing.push('Asset identifier (Serial, VIN, or Plate)');
      }
      if (!fields.make) missing.push('Manufacturer / Make');
      break;
    default:
      break;
  }

  const expectedFieldCount = evidenceType === 'licence_disc' || evidenceType === 'registration_document' ? 3
    : evidenceType === 'number_plate' ? 1
    : evidenceType === 'purchase_invoice' ? 2 : 1;

  const foundCount = expectedFieldCount - missing.length;
  const fieldCompleteness = Math.max(0, Math.min(1, foundCount / expectedFieldCount));

  const confidence = typeof nativeConfidence === 'number' && !isNaN(nativeConfidence)
    ? nativeConfidence
    : (foundCount > 0 ? 0.70 : 0.40);

  const lowConfidence = confidence < 0.82;
  const incomplete = missing.length > 0;

  if (lowConfidence) {
    reasons.push(`Optical confidence is below threshold (${Math.round(confidence * 100)}% < 82%).`);
  }
  if (incomplete) {
    reasons.push(`Unresolved required fields: ${missing.join(', ')}.`);
  }

  const requiresCloudEnhance = lowConfidence || incomplete;

  return {
    overallConfidence: confidence,
    fieldCompleteness,
    requiresCloudEnhance,
    missingFields: missing,
    reasons,
    suggestedAction: requiresCloudEnhance ? 'cloud_enhance_recommended' : 'direct_review',
  };
}
