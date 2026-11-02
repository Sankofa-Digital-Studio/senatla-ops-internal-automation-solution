import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CANONICAL_APK_URL,
  HISTORICAL_APK_URL,
  handleApkDownload,
} from '../api/download-apk.mjs';

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

  await handleApkDownload(req, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.headers['location'], CANONICAL_APK_URL);
  assert.equal(res.headers['content-disposition'], 'attachment; filename="senatla-ops-dev.apk"');
  assert.equal(res.headers['content-type'], 'application/vnd.android.package-archive');
  assert.match(res.headers['cache-control'], /public/);
});

test('HEAD /api/download-apk returns redirect metadata headers', async () => {
  const req = { method: 'HEAD', url: '/api/download-apk' };
  const res = mockResponse();

  await handleApkDownload(req, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.headers['location'], CANONICAL_APK_URL);
  assert.equal(res.headers['content-type'], 'application/vnd.android.package-archive');
  assert.equal(res.body, '');
});

test('GET /api/download-apk?format=json returns download metadata', async () => {
  const req = { method: 'GET', url: '/api/download-apk?format=json' };
  const res = mockResponse();

  await handleApkDownload(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  const payload = JSON.parse(res.body);
  assert.equal(payload.filename, 'senatla-ops-dev.apk');
  assert.equal(payload.downloadUrl, CANONICAL_APK_URL);
  assert.equal(payload.fallbackUrl, HISTORICAL_APK_URL);
  assert.equal(payload.contentType, 'application/vnd.android.package-archive');
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
