import { WebPlugin } from '@capacitor/core';
import {
  ReleaseScanOptions,
  ScanError,
  ScanOptions,
  ScanResult,
  ScannerAvailability,
  SenatlaDocumentScannerPlugin,
} from './scan-contract';

export class SenatlaDocumentScannerWeb extends WebPlugin implements SenatlaDocumentScannerPlugin {
  async isAvailable(): Promise<ScannerAvailability> {
    return { available: false, reason: 'unsupported_platform' };
  }

  async scan(_options: ScanOptions): Promise<ScanResult> {
    throw new ScanError('UNSUPPORTED_PLATFORM');
  }

  async release(_options: ReleaseScanOptions): Promise<void> {
    // Web never creates native artifacts. Idempotent release keeps cleanup uniform.
  }
}
