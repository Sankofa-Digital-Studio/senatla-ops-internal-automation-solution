import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpFilterToolbarComponent } from './erp-filter-toolbar.component';

describe('ErpFilterToolbarComponent', () => {
  let fixture: ComponentFixture<ErpFilterToolbarComponent>;
  let component: ErpFilterToolbarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpFilterToolbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpFilterToolbarComponent);
    component = fixture.componentInstance;
  });

  it('emits search query changes', () => {
    spyOn(component.filterChange, 'emit');
    fixture.detectChanges();

    component.onSearchChange('John');
    expect(component.filterChange.emit).toHaveBeenCalledWith({
      search: 'John',
      selectedFilter: '',
    });
  });

  it('renders filter options and emits selection', () => {
    fixture.componentRef.setInput('filterOptions', [
      { label: 'Active', value: 'active' },
      { label: 'Pending', value: 'pending' },
    ]);
    fixture.detectChanges();

    spyOn(component.filterChange, 'emit');
    component.onFilterSelect('active');

    expect(component.filterChange.emit).toHaveBeenCalledWith({
      search: '',
      selectedFilter: 'active',
    });
  });

  it('clears active filters', () => {
    component.searchQuery.set('term');
    component.selectedFilter.set('active');
    expect(component.hasActiveFilters()).toBeTrue();

    spyOn(component.filterChange, 'emit');
    component.clearFilters();

    expect(component.hasActiveFilters()).toBeFalse();
    expect(component.filterChange.emit).toHaveBeenCalledWith({
      search: '',
      selectedFilter: '',
    });
  });
});
