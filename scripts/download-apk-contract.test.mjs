import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CANONICAL_APK_URL,
  HISTORICAL_APK_URL,
  handleApkDownload,
  resolveLatestApkRelease,
} from '../api/download-apk.mjs';

const resolvedRelease = {
  downloadUrl: 'https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/download/dev-abc123/senatla-ops-dev.apk',
  releaseTag: 'dev-abc123',
  fallback: false,
};
const resolveRelease = async () => resolvedRelease;

function mockResponse() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: '',
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end(data) {
      if (data) this.body = data;
    },
  };
}

test('GET /api/download-apk issues 302 redirect to canonical dev APK asset', async () => {
  const req = { method: 'GET', url: '/api/download-apk' };
  const res = mockResponse();

  await handleApkDownload(req, res, { resolveRelease });

  assert.equal(res.statusCode, 302);
  assert.equal(res.headers['location'], resolvedRelease.downloadUrl);
  assert.equal(res.headers['content-disposition'], 'attachment; filename="senatla-ops-dev.apk"');
  assert.equal(res.headers['content-type'], 'application/vnd.android.package-archive');
  assert.match(res.headers['cache-control'], /public/);
});

test('HEAD /api/download-apk returns redirect metadata headers', async () => {
  const req = { method: 'HEAD', url: '/api/download-apk' };
  const res = mockResponse();

  await handleApkDownload(req, res, { resolveRelease });

  assert.equal(res.statusCode, 302);
  assert.equal(res.headers['location'], resolvedRelease.downloadUrl);
  assert.equal(res.headers['content-type'], 'application/vnd.android.package-archive');
  assert.equal(res.body, '');
});

test('GET /api/download-apk?format=json returns download metadata', async () => {
  const req = { method: 'GET', url: '/api/download-apk?format=json' };
  const res = mockResponse();

  await handleApkDownload(req, res, { resolveRelease });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  const payload = JSON.parse(res.body);
  assert.equal(payload.filename, 'senatla-ops-dev.apk');
  assert.equal(payload.downloadUrl, resolvedRelease.downloadUrl);
  assert.equal(payload.fallbackUrl, HISTORICAL_APK_URL);
  assert.equal(payload.contentType, 'application/vnd.android.package-archive');
  assert.equal(payload.releaseTag, 'dev-abc123');
  assert.equal(payload.fallback, false);
});

test('APK resolver selects the newest immutable dev release asset', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      return [{
        draft: false,
        prerelease: true,
        tag_name: 'dev-fedcba',
        assets: [{ name: 'senatla-ops-dev.apk', browser_download_url: resolvedRelease.downloadUrl }],
      }];
    },
  });
  const release = await resolveLatestApkRelease({ fetchImpl, now: 1 });
  assert.equal(release.releaseTag, 'dev-fedcba');
  assert.equal(release.downloadUrl, resolvedRelease.downloadUrl);
  assert.equal(release.fallback, false);
});

test('POST /api/download-apk is rejected with 405 Method Not Allowed', async () => {
  const req = { method: 'POST', url: '/api/download-apk' };
  const res = mockResponse();

  await handleApkDownload(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers['allow'], 'GET, HEAD');
  const payload = JSON.parse(res.body);
  assert.match(payload.error, /Method Not Allowed/i);
});
