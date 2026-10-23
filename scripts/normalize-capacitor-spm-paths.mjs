import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url);
const source = readFileSync(manifestPath, 'utf8');
const normalized = source
  .replace(/path: "([^"]+)"/g, (_, packagePath) => `path: "${packagePath.replaceAll('\\', '/')}"`)
  .replace('platforms: [.iOS(.v15)]', 'platforms: [.iOS(.v17)]');

if (!normalized.includes('platforms: [.iOS(.v17)]')) {
  throw new Error('CapApp-SPM must target the approved iOS 17 baseline.');
}

if (/path: "[^"]*\\[^"]*"/.test(normalized)) {
  throw new Error('CapApp-SPM contains a Windows-style Swift package path.');
}

if (normalized !== source) {
  writeFileSync(manifestPath, normalized, 'utf8');
}
