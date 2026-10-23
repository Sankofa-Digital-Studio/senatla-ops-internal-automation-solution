import { registerPlugin } from '@capacitor/core';
import { SENATLA_DOCUMENT_SCANNER_PLUGIN, SenatlaDocumentScannerPlugin } from './scan-contract';

export const SenatlaDocumentScanner = registerPlugin<SenatlaDocumentScannerPlugin>(
  SENATLA_DOCUMENT_SCANNER_PLUGIN,
  {
    web: () => import('./senatla-document-scanner.web').then(
      ({ SenatlaDocumentScannerWeb }) => new SenatlaDocumentScannerWeb(),
    ),
  },
);
