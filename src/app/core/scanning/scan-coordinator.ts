import { Capacitor } from '@capacitor/core';
import {
  AssetEvidenceScan,
  ReleaseScanOptions,
  SCAN_LIMITS,
  ScanBounds,
  ScanError,
  ScanErrorCode,
  ScanOptions,
  ScanPage,
  ScanResult,
  ScanTextBlock,
  SenatlaDocumentScannerPlugin,
} from './scan-contract';
import { SenatlaDocumentScanner } from './senatla-document-scanner.plugin';

export interface AssetEvidenceScanOptions {
  galleryImportAllowed: boolean;
  recognitionLanguages: string[];
}

export interface ScanCoordinatorDependencies {
  plugin: SenatlaDocumentScannerPlugin;
  convertFileSrc: (uri: string) => string;
  fetchFile: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  createSessionId: () => string;
  digestSha256: (blob: Blob) => Promise<string>;
}

const DEFAULT_DEPENDENCIES: ScanCoordinatorDependencies = {
  plugin: SenatlaDocumentScanner,
  convertFileSrc: (uri) => Capacitor.convertFileSrc(uri),
  fetchFile: (input, init) => fetch(input, init),
  createSessionId: () => crypto.randomUUID(),
  digestSha256: async (blob) => {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  },
};

/**
 * Serializes native scanning sessions and owns temporary-artifact cleanup.
 * The current asset evidence workflow accepts one File per evidence record;
 * the native contract still supports up to five pages for later workflows.
 */
export class ScanCoordinator {
  private queue: Promise<void> = Promise.resolve();
  private readonly dependencies: ScanCoordinatorDependencies;

  constructor(dependencies: Partial<ScanCoordinatorDependencies> = {}) {
    this.dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  }

  scanAssetEvidence(options: AssetEvidenceScanOptions): Promise<AssetEvidenceScan> {
    const run = this.queue.then(() => this.execute(options), () => this.execute(options));
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async execute(options: AssetEvidenceScanOptions): Promise<AssetEvidenceScan> {
    const sessionId = this.dependencies.createSessionId();
    const scanOptions: ScanOptions = {
      sessionId,
      maxPages: 1,
      galleryImportAllowed: options.galleryImportAllowed,
      recognitionLanguages: [...options.recognitionLanguages],
    };
    let artifactIds: string[] | undefined;
    let value: AssetEvidenceScan | undefined;
    let failure: ScanError | undefined;

    try {
      this.validateOptions(scanOptions);
      const availability = await this.dependencies.plugin.isAvailable();
      if (!availability.available) throw new ScanError('UNSUPPORTED_PLATFORM');
      const result = await this.dependencies.plugin.scan(scanOptions);
      artifactIds = Array.isArray(result?.pages)
        ? result.pages.reduce<string[]>((ids, page) => {
          if (typeof page?.artifactId === 'string' && this.isUuid(page.artifactId)) ids.push(page.artifactId);
          return ids;
        }, [])
        : undefined;
      const page = this.validateResult(result, scanOptions);
      value = await this.materializePage(page, scanOptions);
    } catch (error) {
      failure = this.toScanError(error);
    } finally {
      const releaseOptions: ReleaseScanOptions = artifactIds?.length
        ? { sessionId, artifactIds }
        : { sessionId };
      try {
        await this.dependencies.plugin.release(releaseOptions);
      } catch {
        if (!failure) failure = new ScanError('CLEANUP_FAILED');
      }
    }

    if (failure) throw failure;
    if (!value) throw new ScanError('NATIVE_FAILURE');
    return value;
  }

  private validateOptions(options: ScanOptions): void {
    if (!this.isUuid(options.sessionId)
      || !Number.isInteger(options.maxPages)
      || options.maxPages < SCAN_LIMITS.minPages
      || options.maxPages > SCAN_LIMITS.maxPages
      || typeof options.galleryImportAllowed !== 'boolean'
      || !Array.isArray(options.recognitionLanguages)
      || options.recognitionLanguages.length > SCAN_LIMITS.maxRecognitionLanguages) {
      throw new ScanError('INVALID_OPTIONS');
    }
    const languages = options.recognitionLanguages;
    if (new Set(languages).size !== languages.length
      || languages.some((language) => !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language))) {
      throw new ScanError('INVALID_OPTIONS');
    }
  }

  private validateResult(result: ScanResult, options: ScanOptions): ScanPage {
    if (!result || result.sessionId !== options.sessionId || !Array.isArray(result.pages)
      || result.pages.length !== 1 || result.pages.length > options.maxPages) {
      throw new ScanError('MALFORMED_RESULT');
    }
    const page = result.pages[0];
    if (!page
      || !this.isUuid(page.artifactId)
      || !this.isLocalUri(page.uri)
      || page.mimeType !== 'image/jpeg'
      || !Number.isInteger(page.byteSize)
      || page.byteSize <= 0
      || !Number.isInteger(page.width)
      || !Number.isInteger(page.height)
      || page.width < SCAN_LIMITS.minDimensionPixels
      || page.height < SCAN_LIMITS.minDimensionPixels
      || page.width > SCAN_LIMITS.maxDimensionPixels
      || page.height > SCAN_LIMITS.maxDimensionPixels
      || !/^[a-f0-9]{64}$/.test(page.sha256)
      || typeof page.text !== 'string'
      || page.text.length > SCAN_LIMITS.maxTextCharacters
      || !Array.isArray(page.textBlocks)
      || page.textBlocks.length > SCAN_LIMITS.maxTextBlocks
      || page.textBlocks.some((block) => !this.isValidTextBlock(block))) {
      throw new ScanError(page?.byteSize > SCAN_LIMITS.maxArtifactBytes ? 'ARTIFACT_TOO_LARGE' : 'MALFORMED_RESULT');
    }
    if (page.byteSize > SCAN_LIMITS.maxArtifactBytes) throw new ScanError('ARTIFACT_TOO_LARGE');
    return page;
  }

  private async materializePage(page: ScanPage, options: ScanOptions): Promise<AssetEvidenceScan> {
    let response: Response;
    try {
      response = await this.dependencies.fetchFile(this.dependencies.convertFileSrc(page.uri), { cache: 'no-store' });
    } catch {
      throw new ScanError('ARTIFACT_FETCH_FAILED');
    }
    if (!response.ok) throw new ScanError('ARTIFACT_FETCH_FAILED');
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > SCAN_LIMITS.maxArtifactBytes) {
      throw new ScanError('ARTIFACT_TOO_LARGE');
    }

    let blob: Blob;
    try {
      blob = await response.blob();
    } catch {
      throw new ScanError('ARTIFACT_FETCH_FAILED');
    }
    if (blob.size > SCAN_LIMITS.maxArtifactBytes) throw new ScanError('ARTIFACT_TOO_LARGE');
    if (blob.size <= 0 || blob.size !== page.byteSize || blob.type !== 'image/jpeg') {
      throw new ScanError('ARTIFACT_INTEGRITY_FAILED');
    }
    let digest: string;
    try {
      digest = await this.dependencies.digestSha256(blob);
    } catch {
      throw new ScanError('ARTIFACT_INTEGRITY_FAILED');
    }
    if (digest.toLowerCase() !== page.sha256) throw new ScanError('ARTIFACT_INTEGRITY_FAILED');

    return {
      sessionId: options.sessionId,
      artifactId: page.artifactId,
      file: new File([blob], `${page.artifactId}.jpg`, { type: 'image/jpeg' }),
      width: page.width,
      height: page.height,
      sha256: page.sha256,
      ocr: {
        text: page.text,
        textBlocks: page.textBlocks.map((block) => ({ ...block, bounds: block.bounds ? { ...block.bounds } : undefined })),
        recognitionLanguages: [...options.recognitionLanguages],
      },
    };
  }

  private isValidTextBlock(block: ScanTextBlock): boolean {
    return Boolean(block)
      && typeof block.text === 'string'
      && block.text.length <= SCAN_LIMITS.maxTextCharacters
      && (block.confidence === undefined || (Number.isFinite(block.confidence) && block.confidence >= 0 && block.confidence <= 1))
      && (block.bounds === undefined || this.isValidBounds(block.bounds));
  }

  private isValidBounds(bounds: ScanBounds): boolean {
    const values = [bounds.x, bounds.y, bounds.width, bounds.height];
    return values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)
      && bounds.x + bounds.width <= 1.000001
      && bounds.y + bounds.height <= 1.000001;
  }

  private isLocalUri(uri: unknown): uri is string {
    return typeof uri === 'string' && /^file:\/\//.test(uri) && !/[\r\n]/.test(uri);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private toScanError(error: unknown): ScanError {
    if (error instanceof ScanError) return error;
    return new ScanError(this.nativeErrorCode(error));
  }

  private nativeErrorCode(error: unknown): ScanErrorCode {
    if (!error || typeof error !== 'object') return 'NATIVE_FAILURE';
    const candidate = (error as { code?: unknown }).code;
    if (candidate === 'USER_CANCELLED' || candidate === 'PERMISSION_DENIED' || candidate === 'UNSUPPORTED_PLATFORM') return candidate;
    return 'NATIVE_FAILURE';
  }
}
