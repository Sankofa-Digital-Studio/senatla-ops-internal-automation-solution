import {
  evaluateOcrQuality,
  extractStructuredFields,
  normalizeDate,
  normalizeRegistrationNumber,
  normalizeVin,
} from './ocr-quality-evaluator';

describe('OCR Quality and Domain Extraction', () => {
  describe('normalizeDate', () => {
    it('normalizes ISO dates correctly', () => {
      expect(normalizeDate('2027-04-30')).toBe('2027-04-30');
      expect(normalizeDate('2026/12/31')).toBe('2026-12-31');
    });

    it('normalizes DD/MM/YYYY dates correctly', () => {
      expect(normalizeDate('31/12/2026')).toBe('2026-12-31');
      expect(normalizeDate('05-08-2027')).toBe('2027-08-05');
    });

    it('normalizes text month dates', () => {
      expect(normalizeDate('31 Jan 2027')).toBe('2027-01-31');
      expect(normalizeDate('15-OCT-2028')).toBe('2028-10-15');
    });

    it('returns undefined for invalid or empty dates', () => {
      expect(normalizeDate('')).toBeUndefined();
      expect(normalizeDate('not-a-date')).toBeUndefined();
    });
  });

  describe('normalizeVin', () => {
    it('accepts valid 17-character ISO VIN without spaces', () => {
      const validVin = 'AAVZZZ10ZCP012345';
      expect(normalizeVin(validVin)).toBe(validVin);
    });

    it('cleans spaces and hyphens from VIN', () => {
      expect(normalizeVin('AAV-ZZZ10Z-CP012345')).toBe('AAVZZZ10ZCP012345');
    });

    it('rejects VINs containing illegal characters (I, O, Q)', () => {
      expect(normalizeVin('AAVZZZ1OZCP012345')).toBeUndefined(); // Contains letter O
      expect(normalizeVin('AAVZZZ1IZCP012345')).toBeUndefined(); // Contains letter I
    });

    it('rejects truncated or overlong VINs', () => {
      expect(normalizeVin('AAVZZZ10ZCP01234')).toBeUndefined(); // 16 chars
      expect(normalizeVin('AAVZZZ10ZCP0123456')).toBeUndefined(); // 18 chars
    });
  });

  describe('normalizeRegistrationNumber', () => {
    it('normalizes South African registration plate formats', () => {
      expect(normalizeRegistrationNumber('ca 123-456')).toBe('CA 123-456');
      expect(normalizeRegistrationNumber('ab 12 cd gp')).toBe('AB 12 CD GP');
      expect(normalizeRegistrationNumber('nd 456-789')).toBe('ND 456-789');
    });
  });

  describe('extractStructuredFields', () => {
    it('extracts complete fields from simulated South African Natis disc text', () => {
      const natisSample = `
        REPUBLIC OF SOUTH AFRICA
        NATIONAL ROAD TRAFFIC ACT, 1996
        LICENCE NUMBER: CA 123-456
        VEHICLE IDENTIFIER (VIN): AAVZZZ10ZCP012345
        ENGINE NUMBER: 1GD1234567
        MAKE: TOYOTA
        SERIES NAME: HILUX 2.8 GD-6
        DATE OF EXPIRY: 2027-06-30
      `;

      const extracted = extractStructuredFields(natisSample);
      expect(extracted.registrationNumber).toBe('CA 123-456');
      expect(extracted.vin).toBe('AAVZZZ10ZCP012345');
      expect(extracted.make).toBe('Toyota');
      expect(extracted.model).toBe('HILUX 2.8 GD-6');
      expect(extracted.licenseExpiry).toBe('2027-06-30');
      expect(extracted.engineNumber).toBe('1GD1234567');
    });

    it('extracts equipment serial and make from purchase invoice text', () => {
      const invoiceSample = `
        TAX INVOICE # INV-2026-9901
        Customer: Senatla Trading Enterprise
        Equipment Description: CATERPILLAR Hydraulic Excavator
        Model: 320 GC
        Serial Number: CAT-320-EX-0042
        Delivery Date: 2026-03-15
      `;

      const extracted = extractStructuredFields(invoiceSample);
      expect(extracted.make).toBe('Caterpillar');
      expect(extracted.model).toBe('320 GC');
      expect(extracted.serialNumber).toBe('CAT-320-EX-0042');
    });

    it('extracts structured JSON payload directly when provided', () => {
      const jsonSample = JSON.stringify({
        registrationNumber: 'AB 12 CD GP',
        vin: '1HGCR2F83HA001234',
        make: 'Honda',
        model: 'Accord',
        licenseExpiry: '2028-11-30',
      });

      const extracted = extractStructuredFields(jsonSample);
      expect(extracted.registrationNumber).toBe('AB 12 CD GP');
      expect(extracted.vin).toBe('1HGCR2F83HA001234');
      expect(extracted.make).toBe('Honda');
      expect(extracted.licenseExpiry).toBe('2028-11-30');
    });
  });

  describe('evaluateOcrQuality (Confidence & Quality Gate)', () => {
    it('approves direct review when all required Natis fields are present and confidence is high', () => {
      const completeFields = {
        registrationNumber: 'CA 123-456',
        vin: 'AAVZZZ10ZCP012345',
        licenseExpiry: '2027-05-31',
        make: 'Toyota',
      };

      const assessment = evaluateOcrQuality(completeFields, 'licence_disc', 0.94);
      expect(assessment.requiresCloudEnhance).toBeFalse();
      expect(assessment.fieldCompleteness).toBe(1.0);
      expect(assessment.suggestedAction).toBe('direct_review');
      expect(assessment.missingFields.length).toBe(0);
      expect(assessment.reasons.length).toBe(0);
    });

    it('recommends cloud enhancement when optical confidence is below 82%', () => {
      const completeFields = {
        registrationNumber: 'CA 123-456',
        vin: 'AAVZZZ10ZCP012345',
        licenseExpiry: '2027-05-31',
      };

      const assessment = evaluateOcrQuality(completeFields, 'licence_disc', 0.65);
      expect(assessment.requiresCloudEnhance).toBeTrue();
      expect(assessment.suggestedAction).toBe('cloud_enhance_recommended');
      expect(assessment.reasons).toContain('Optical confidence is below threshold (65% < 82%).');
    });

    it('recommends cloud enhancement when required VIN or expiry is missing', () => {
      const incompleteFields = {
        registrationNumber: 'CA 123-456',
        // Missing VIN and Expiry
      };

      const assessment = evaluateOcrQuality(incompleteFields, 'licence_disc', 0.90);
      expect(assessment.requiresCloudEnhance).toBeTrue();
      expect(assessment.missingFields).toContain('17-character VIN');
      expect(assessment.missingFields).toContain('License expiry date');
      expect(assessment.suggestedAction).toBe('cloud_enhance_recommended');
    });
  });
});
