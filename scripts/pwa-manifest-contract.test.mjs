import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('PWA manifest exists, is valid JSON, and meets PWA installability requirements', () => {
  const manifestPath = resolve(root, 'src/manifest.webmanifest');
  assert.ok(existsSync(manifestPath), 'src/manifest.webmanifest must exist');

  const content = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.name, 'Senatla Ops');
  assert.equal(manifest.short_name, 'Senatla Ops');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#bef264');
  assert.equal(manifest.background_color, '#0f172a');
  assert.ok(Array.isArray(manifest.icons), 'icons must be an array');
  assert.ok(manifest.icons.length >= 2, 'manifest must specify at least 192 and 512 icons');

  const has192 = manifest.icons.some((i) => i.sizes === '192x192');
  const has512 = manifest.icons.some((i) => i.sizes === '512x512');
  const hasMaskable = manifest.icons.some((i) => i.purpose?.includes('maskable'));

  assert.ok(has192, 'manifest must have 192x192 icon');
  assert.ok(has512, 'manifest must have 512x512 icon');
  assert.ok(hasMaskable, 'manifest must have maskable icon');
});

test('Declared PWA icon files exist on disk and have matching PNG headers', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'src/manifest.webmanifest'), 'utf8'));

  for (const icon of manifest.icons) {
    const iconPath = resolve(root, 'src', icon.src);
    assert.ok(existsSync(iconPath), `Icon file must exist: ${icon.src}`);

    const buf = readFileSync(iconPath);
    // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    assert.equal(buf[0], 0x89, `Icon ${icon.src} must be valid PNG`);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4e);
    assert.equal(buf[3], 0x47);

    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const expectedSizes = icon.sizes.split('x').map(Number);
    assert.equal(width, expectedSizes[0], `Icon width mismatch for ${icon.src}`);
    assert.equal(height, expectedSizes[1], `Icon height mismatch for ${icon.src}`);
  }
});

test('index.html contains required PWA manifest link and iOS meta/touch-icon tags', () => {
  const indexHtml = readFileSync(resolve(root, 'src/index.html'), 'utf8');

  assert.match(indexHtml, /<link\s+rel=["']manifest["']\s+href=["']manifest\.webmanifest["']/i);
  assert.match(indexHtml, /<meta\s+name=["']theme-color["']\s+content=["']#bef264["']/i);
  assert.match(indexHtml, /<meta\s+name=["']apple-mobile-web-app-capable["']\s+content=["']yes["']/i);
  assert.match(indexHtml, /<meta\s+name=["']apple-mobile-web-app-status-bar-style["']/i);
  assert.match(indexHtml, /<meta\s+name=["']apple-mobile-web-app-title["']\s+content=["']Senatla Ops["']/i);
  assert.match(indexHtml, /<link\s+rel=["']apple-touch-icon["']/i);
});

test('Service worker sw.js exists, precaches shell, and handles offline navigation', () => {
  const swPath = resolve(root, 'src/sw.js');
  assert.ok(existsSync(swPath), 'src/sw.js must exist');

  const swContent = readFileSync(swPath, 'utf8');
  assert.match(swContent, /CACHE_NAME/);
  assert.match(swContent, /PRECACHE_ASSETS/);
  assert.match(swContent, /\/manifest\.webmanifest/);
  assert.match(swContent, /navigate/);
  assert.match(swContent, /\/index\.html/);
});

test('angular.json includes manifest.webmanifest and sw.js in build assets', () => {
  const angularJson = JSON.parse(readFileSync(resolve(root, 'angular.json'), 'utf8'));
  const assets = angularJson.projects.app.architect.build.options.assets;

  assert.ok(assets.includes('src/manifest.webmanifest'), 'angular.json assets must include src/manifest.webmanifest');
  assert.ok(assets.includes('src/sw.js'), 'angular.json assets must include src/sw.js');
});
