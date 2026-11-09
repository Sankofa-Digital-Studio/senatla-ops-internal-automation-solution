import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpColumnDef, ErpDataTableComponent } from './erp-data-table.component';

describe('ErpDataTableComponent', () => {
  let fixture: ComponentFixture<ErpDataTableComponent>;
  let component: ErpDataTableComponent;

  interface TestRow {
    [key: string]: unknown;
    id: string;
    name: string;
    role: string;
    count: number;
  }

  const columns: ErpColumnDef<TestRow>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
    { key: 'count', label: 'Count', sortable: true, align: 'right' },
  ];

  const testData: TestRow[] = [
    { id: '1', name: 'Zoe', role: 'Engineer', count: 10 },
    { id: '2', name: 'Adam', role: 'Director', count: 5 },
    { id: '3', name: 'Mary', role: 'Clerk', count: 20 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpDataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpDataTableComponent);
    component = fixture.componentInstance;
  });

  it('renders columns and data rows', () => {
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', testData);
    fixture.detectChanges();

    const ths = fixture.nativeElement.querySelectorAll('th');
    expect(ths.length).toBe(3);
    expect(ths[0].textContent).toContain('Name');

    const tds = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(tds.length).toBe(3);
  });

  it('sorts data when clicking sortable column header', () => {
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', testData);
    fixture.detectChanges();

    // Sort by name ASC
    component.toggleSort('name');
    fixture.detectChanges();
    expect(component.sortedData()[0]['name']).toBe('Adam');

    // Sort by name DESC
    component.toggleSort('name');
    fixture.detectChanges();
    expect(component.sortedData()[0]['name']).toBe('Zoe');
  });

  it('paginates data when pageSize is exceeded', () => {
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', testData);
    fixture.componentRef.setInput('pageSize', 2);
    fixture.detectChanges();

    expect(component.totalPages()).toBe(2);
    expect(component.paginatedData().length).toBe(2);

    component.nextPage();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(2);
    expect(component.paginatedData().length).toBe(1);
  });

  it('shows empty message when data is empty', () => {
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('emptyMessage', 'No test records found');
    fixture.detectChanges();

    const emptyTd = fixture.nativeElement.querySelector('tbody td');
    expect(emptyTd.textContent).toContain('No test records found');
  });
});
