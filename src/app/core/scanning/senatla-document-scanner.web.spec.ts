import { ScanError } from './scan-contract';
import { SenatlaDocumentScannerWeb } from './senatla-document-scanner.web';

describe('SenatlaDocumentScannerWeb', () => {
  it('is an explicit unsupported fallback with idempotent cleanup', async () => {
    const scanner = new SenatlaDocumentScannerWeb();
    await expectAsync(scanner.isAvailable()).toBeResolvedTo({
      available: false,
      reason: 'unsupported_platform',
    });
    await expectAsync(scanner.scan({
      sessionId: '9a5d7b2d-3d11-4c67-9c1b-62dce148f821',
      maxPages: 1,
      galleryImportAllowed: false,
      recognitionLanguages: [],
    })).toBeRejectedWith(jasmine.any(ScanError));
    await expectAsync(scanner.release({
      sessionId: '9a5d7b2d-3d11-4c67-9c1b-62dce148f821',
    })).toBeResolved();
  });
});
