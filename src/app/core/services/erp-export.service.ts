import { Injectable } from '@angular/core';

export interface ExportColumn<T = Record<string, unknown>> {
  header: string;
  key: string;
  width?: number;
  formatter?: (val: unknown, row: T) => string;
}

export interface ExportOptions<T = Record<string, unknown>> {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  data: T[];
  preferBackend?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ErpExportService {
  /**
   * Universal export entry point supporting CSV, XLSX, and PDF
   */
  async export<T extends Record<string, unknown>>(
    format: 'csv' | 'xlsx' | 'pdf',
    options: ExportOptions<T>
  ): Promise<void> {
    // If preferBackend is set or dataset is large (> 500 records), trigger serverless batch export
    if (options.preferBackend || options.data.length > 500) {
      try {
        await this.exportViaBackend(format, options);
        return;
      } catch (err) {
        console.warn('Backend export failed, falling back to client-side generation:', err);
      }
    }

    switch (format) {
      case 'csv':
        this.exportCsv(options);
        break;
      case 'xlsx':
        await this.exportExcel(options);
        break;
      case 'pdf':
        await this.exportPdf(options);
        break;
    }
  }

  exportCsv<T extends Record<string, unknown>>(options: ExportOptions<T>): void {
    const headers = options.columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const rows = options.data.map((row) =>
      options.columns
        .map((col) => {
          const raw = row[col.key];
          const formatted = col.formatter ? col.formatter(raw, row) : raw == null ? '' : String(raw);
          return `"${formatted.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `${this.sanitizeFilename(options.filename)}.csv`);
  }

  async exportExcel<T extends Record<string, unknown>>(options: ExportOptions<T>): Promise<void> {
    const imported = await import('exceljs');
    const ExcelJS = imported.default || imported;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Senatla Ops';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(options.title || 'Report', {
      views: [{ state: 'frozen', ySplit: options.title ? 3 : 1 }],
    });

    let startRow = 1;
    if (options.title) {
      sheet.mergeCells(1, 1, 1, options.columns.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = options.title;
      titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17212D' } };
      sheet.getRow(1).height = 28;

      if (options.subtitle) {
        sheet.mergeCells(2, 1, 2, options.columns.length);
        const subCell = sheet.getCell(2, 1);
        subCell.value = options.subtitle;
        subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFCCCCCC' } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        sheet.getRow(2).height = 20;
      }
      startRow = options.subtitle ? 4 : 3;
    }

    // Set columns
    sheet.columns = options.columns.map((col) => ({
      key: col.key,
      width: col.width || Math.max(col.header.length + 4, 15),
    }));

    // Header row
    const headerRow = sheet.getRow(startRow);
    options.columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    });
    headerRow.height = 24;

    // Data rows
    options.data.forEach((row) => {
      const rowValues = options.columns.map((col) => {
        const raw = row[col.key];
        return col.formatter ? col.formatter(raw, row) : raw ?? '';
      });
      sheet.addRow(rowValues);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.triggerDownload(blob, `${this.sanitizeFilename(options.filename)}.xlsx`);
  }

  async exportPdf<T extends Record<string, unknown>>(options: ExportOptions<T>): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

    const isWide = options.columns.length > 5;
    const doc = new jsPDF({
      orientation: isWide ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let currentY = 15;
    if (options.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(options.title, 14, currentY);
      currentY += 6;
    }

    if (options.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(options.subtitle, 14, currentY);
      currentY += 8;
    }

    const headers = options.columns.map((c) => c.header);
    const body = options.data.map((row) =>
      options.columns.map((col) => {
        const raw = row[col.key];
        return col.formatter ? col.formatter(raw, row) : raw == null ? '-' : String(raw);
      })
    );

    autoTable(doc, {
      startY: currentY,
      head: [headers],
      body,
      theme: 'grid',
      headStyles: { fillColor: [24, 59, 84], fontSize: 9 },
      styles: { fontSize: 8, overflow: 'linebreak' },
      margin: { left: 14, right: 14, bottom: 15 },
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageWidth = doc.internal.pageSize.width;
      doc.text(
        `Senatla Ops Report · Generated ${new Date().toLocaleDateString('en-ZA')} · Page ${i} of ${pages}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 8,
        { align: 'center' }
      );
    }

    const blob = doc.output('blob');
    this.triggerDownload(blob, `${this.sanitizeFilename(options.filename)}.pdf`);
  }

  async exportViaBackend<T extends Record<string, unknown>>(
    format: 'csv' | 'xlsx' | 'pdf',
    options: ExportOptions<T>
  ): Promise<void> {
    const response = await fetch('/api/export/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format,
        filename: options.filename,
        title: options.title,
        columns: options.columns.map((c) => ({ header: c.header, key: c.key })),
        data: options.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serverless batch export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    this.triggerDownload(blob, `${this.sanitizeFilename(options.filename)}.${format}`);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'senatla_export';
  }
}
