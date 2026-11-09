import { TestBed } from '@angular/core/testing';
import { ErpExportService, ExportOptions } from './erp-export.service';

describe('ErpExportService', () => {
  let service: ErpExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErpExportService);
  });

  it('creates csv blob and triggers download', () => {
    spyOn(service as unknown as { triggerDownload: (blob: Blob, name: string) => void }, 'triggerDownload');

    const options: ExportOptions = {
      filename: 'test_report',
      columns: [
        { header: 'Name', key: 'name' },
        { header: 'Role', key: 'role' },
      ],
      data: [{ name: 'Sipho', role: 'Operator' }],
    };

    service.exportCsv(options);

    const spy = (service as unknown as { triggerDownload: jasmine.Spy }).triggerDownload;
    expect(spy).toHaveBeenCalled();
    expect(spy.calls.mostRecent().args[1]).toBe('test_report.csv');
  });

  it('sanitizes filename correctly', () => {
    const sanitize = (service as unknown as { sanitizeFilename: (n: string) => string }).sanitizeFilename;
    expect(sanitize('Report 2026/11/08 (Final!)')).toBe('Report_2026_11_08_Final_');
  });
});
