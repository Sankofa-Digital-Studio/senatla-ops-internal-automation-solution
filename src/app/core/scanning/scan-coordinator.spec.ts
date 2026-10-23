import {
  ReleaseScanOptions,
  ScanError,
  ScanOptions,
  ScanPage,
  ScanResult,
  SenatlaDocumentScannerPlugin,
} from './scan-contract';
import { ScanCoordinator, ScanCoordinatorDependencies } from './scan-coordinator';

describe('ScanCoordinator', () => {
  const sessionOne = '9a5d7b2d-3d11-4c67-9c1b-62dce148f821';
  const sessionTwo = '8b43ad4d-5564-49c3-9f25-e633043c5cda';
  const artifactBytes = new Blob(['senatla-jpeg'], { type: 'image/jpeg' });
  const digest = 'a'.repeat(64);
  let plugin: jasmine.SpyObj<SenatlaDocumentScannerPlugin>;
  let dependencies: ScanCoordinatorDependencies;

  beforeEach(() => {
    plugin = jasmine.createSpyObj<SenatlaDocumentScannerPlugin>(
      'SenatlaDocumentScanner',
      ['isAvailable', 'scan', 'release'],
    );
    plugin.isAvailable.and.resolveTo({ available: true });
    plugin.release.and.resolveTo();
    dependencies = {
      plugin,
      convertFileSrc: (uri) => `https://localhost/_capacitor_file_/${encodeURIComponent(uri)}`,
      fetchFile: async () => new Response(artifactBytes, {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': String(artifactBytes.size) },
      }),
      createSessionId: () => sessionOne,
      digestSha256: async () => digest,
    };
    plugin.scan.and.callFake(async (options) => validResult(options.sessionId));
  });

  it('returns one normalized File and OCR result, then releases its native artifact', async () => {
    const result = await new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: ['en-ZA'],
    });

    expect(result.sessionId).toBe(sessionOne);
    expect(result.file).toEqual(jasmine.any(File));
    expect(result.file.name).toBe('c83f99a5-3cca-47de-a652-5dc99ed0bb56.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(result.ocr.text).toBe('REGISTRATION: CA 123-456');
    expect(result.ocr.recognitionLanguages).toEqual(['en-ZA']);
    expect(plugin.scan).toHaveBeenCalledWith(jasmine.objectContaining({
      sessionId: sessionOne,
      maxPages: 1,
      galleryImportAllowed: false,
    }));
    expect(plugin.release).toHaveBeenCalledOnceWith({ sessionId: sessionOne, artifactIds: ['c83f99a5-3cca-47de-a652-5dc99ed0bb56'] });
  });

  it('reports web or device unavailability without pretending OCR succeeded', async () => {
    plugin.isAvailable.and.resolveTo({ available: false, reason: 'unsupported_platform' });
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: [],
    });

    await expectCode(promise, 'UNSUPPORTED_PLATFORM');
    expect(plugin.scan).not.toHaveBeenCalled();
    expect(plugin.release).toHaveBeenCalledOnceWith({ sessionId: sessionOne });
  });

  it('preserves a stable cancellation code and releases the whole session', async () => {
    plugin.scan.and.rejectWith({ code: 'USER_CANCELLED', message: 'sensitive native details' });
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: true,
      recognitionLanguages: ['en'],
    });

    await expectCode(promise, 'USER_CANCELLED');
    expect(plugin.release).toHaveBeenCalledOnceWith({ sessionId: sessionOne });
  });

  it('rejects a mismatched session and releases any returned opaque artifacts', async () => {
    plugin.scan.and.resolveTo(validResult(sessionTwo));
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: ['en-ZA'],
    });

    await expectCode(promise, 'MALFORMED_RESULT');
    expect(plugin.release).toHaveBeenCalledOnceWith({ sessionId: sessionOne, artifactIds: ['c83f99a5-3cca-47de-a652-5dc99ed0bb56'] });
  });

  it('rejects remote/data URIs before fetch while still cleaning up', async () => {
    const malformed = validResult(sessionOne);
    malformed.pages[0].artifactId = 'not-a-uuid';
    malformed.pages[0].uri = 'data:image/jpeg;base64,c2Vuc2l0aXZl';
    plugin.scan.and.resolveTo(malformed);
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: [],
    });

    await expectCode(promise, 'MALFORMED_RESULT');
    expect(plugin.release).toHaveBeenCalledOnceWith({ sessionId: sessionOne });
  });

  it('rejects content whose digest differs from the native integrity metadata', async () => {
    dependencies.digestSha256 = async () => 'b'.repeat(64);
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: [],
    });

    await expectCode(promise, 'ARTIFACT_INTEGRITY_FAILED');
    expect(plugin.release).toHaveBeenCalled();
  });

  it('does not return sensitive content when native cleanup fails', async () => {
    plugin.release.and.rejectWith(new Error('native path details'));
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: [],
    });

    await expectCode(promise, 'CLEANUP_FAILED');
  });

  it('serializes concurrent sessions so only one native scanner owns the camera', async () => {
    const sessionIds = [sessionOne, sessionTwo];
    dependencies.createSessionId = () => sessionIds.shift() ?? sessionTwo;
    let finishFirst: ((result: ScanResult) => void) | undefined;
    plugin.scan.and.callFake((options: ScanOptions) => {
      if (options.sessionId === sessionOne) {
        return new Promise<ScanResult>((resolve) => { finishFirst = resolve; });
      }
      return Promise.resolve(validResult(options.sessionId));
    });
    const coordinator = new ScanCoordinator(dependencies);

    const first = coordinator.scanAssetEvidence({ galleryImportAllowed: false, recognitionLanguages: [] });
    const second = coordinator.scanAssetEvidence({ galleryImportAllowed: false, recognitionLanguages: [] });
    await Promise.resolve();
    await Promise.resolve();
    expect(plugin.scan).toHaveBeenCalledTimes(1);

    if (!finishFirst) fail('The first native scan was not started.');
    finishFirst?.(validResult(sessionOne));
    await first;
    await second;

    expect(plugin.scan).toHaveBeenCalledTimes(2);
    expect(plugin.scan.calls.argsFor(1)[0].sessionId).toBe(sessionTwo);
  });

  it('rejects duplicate or malformed recognition language hints before native scan', async () => {
    const promise = new ScanCoordinator(dependencies).scanAssetEvidence({
      galleryImportAllowed: false,
      recognitionLanguages: ['en-ZA', 'en-ZA'],
    });

    await expectCode(promise, 'INVALID_OPTIONS');
    expect(plugin.scan).not.toHaveBeenCalled();
    expect(plugin.release).toHaveBeenCalledOnceWith({ sessionId: sessionOne });
  });

  function validResult(sessionId: string): ScanResult {
    const page: ScanPage = {
      artifactId: 'c83f99a5-3cca-47de-a652-5dc99ed0bb56',
      uri: 'file:///private/cache/senatla/c83f99a5-3cca-47de-a652-5dc99ed0bb56.jpg',
      mimeType: 'image/jpeg',
      byteSize: artifactBytes.size,
      width: 1600,
      height: 1200,
      sha256: digest,
      text: 'REGISTRATION: CA 123-456',
      textBlocks: [{
        text: 'REGISTRATION: CA 123-456',
        confidence: 0.97,
        bounds: { x: 0.1, y: 0.2, width: 0.7, height: 0.1 },
      }],
    };
    return { sessionId, pages: [page] };
  }

  async function expectCode(promise: Promise<unknown>, code: ScanError['code']): Promise<void> {
    try {
      await promise;
      fail(`Expected scan to reject with ${code}.`);
    } catch (error) {
      expect(error).toEqual(jasmine.any(ScanError));
      expect((error as ScanError).code).toBe(code);
      expect((error as Error).message).not.toContain('sensitive');
      expect((error as Error).message).not.toContain('path');
    }
  }
});
