import type { IncomingMessage, ServerResponse } from 'node:http';

interface BatchExportRequest {
  format: 'csv' | 'xlsx' | 'pdf';
  filename?: string;
  title?: string;
  columns: { header: string; key: string }[];
  data: Record<string, unknown>[];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { format, filename = 'senatla_batch_export', columns, data } = (req.body || {}) as BatchExportRequest;

    if (!Array.isArray(columns) || !Array.isArray(data)) {
      res.status(400).json({ error: 'Valid columns array and data array are required.' });
      return;
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'export';

    if (format === 'csv') {
      const headers = columns.map((c) => `"${(c.header || '').replace(/"/g, '""')}"`).join(',');
      const rows = data.map((row) =>
        columns
          .map((c) => {
            const val = row[c.key];
            const str = val == null ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      const csv = [headers, ...rows].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
      res.status(200).send(csv);
      return;
    }

    if (format === 'xlsx') {
      const imported = await import('exceljs');
      const ExcelJS = imported.default || imported;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Report');

      sheet.columns = columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: Math.max(col.header.length + 5, 14),
      }));

      data.forEach((row) => {
        sheet.addRow(row);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
      res.status(200).send(Buffer.from(buffer));
      return;
    }

    res.status(400).json({ error: `Unsupported format: ${format}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Export failed.' });
  }
}
