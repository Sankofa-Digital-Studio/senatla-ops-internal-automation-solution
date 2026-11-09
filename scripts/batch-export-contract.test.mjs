import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/export/batch.ts';

describe('Serverless Batch Export API Contract', () => {
  it('rejects non-POST requests with 405', async () => {
    let statusCode = 0;
    let jsonResult = null;

    const req = { method: 'GET' };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    await handler(req, res);
    assert.equal(statusCode, 405);
    assert.match(jsonResult.error, /Method not allowed/);
  });

  it('generates valid CSV with headers and row values', async () => {
    let statusCode = 0;
    let bodySent = '';
    const headersSent = {};

    const req = {
      method: 'POST',
      body: {
        format: 'csv',
        filename: 'workforce_export',
        columns: [
          { header: 'Full Name', key: 'name' },
          { header: 'Role', key: 'role' },
        ],
        data: [
          { name: 'Sipho Sithole', role: 'Artisan' },
          { name: 'Lerato Mokoena', role: 'Operator' },
        ],
      },
    };

    const res = {
      setHeader(name, val) {
        headersSent[name] = val;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      send(data) {
        bodySent = data;
        return this;
      },
    };

    await handler(req, res);
    assert.equal(statusCode, 200);
    assert.equal(headersSent['Content-Type'], 'text/csv; charset=utf-8');
    assert.match(headersSent['Content-Disposition'], /attachment; filename="workforce_export\.csv"/);
    assert.match(bodySent, /"Full Name","Role"/);
    assert.match(bodySent, /"Sipho Sithole","Artisan"/);
  });

  it('generates valid XLSX buffer with Excel sheet', async () => {
    let statusCode = 0;
    let bufferSent = null;
    const headersSent = {};

    const req = {
      method: 'POST',
      body: {
        format: 'xlsx',
        filename: 'assets_export',
        columns: [
          { header: 'Registration', key: 'plate' },
          { header: 'Make & Model', key: 'vehicle' },
        ],
        data: [{ plate: 'CA 123 456', vehicle: 'Toyota Hilux' }],
      },
    };

    const res = {
      setHeader(name, val) {
        headersSent[name] = val;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      send(data) {
        bufferSent = data;
        return this;
      },
    };

    await handler(req, res);
    assert.equal(statusCode, 200);
    assert.match(headersSent['Content-Type'], /openxmlformats/);
    assert.ok(Buffer.isBuffer(bufferSent));
    assert.ok(bufferSent.length > 500);
  });
});
