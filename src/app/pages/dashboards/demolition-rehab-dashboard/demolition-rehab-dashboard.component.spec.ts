import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DemolitionRehabDashboardComponent } from './demolition-rehab-dashboard.component';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

describe('DemolitionRehabDashboardComponent', () => {
  let component: DemolitionRehabDashboardComponent;
  let fixture: ComponentFixture<DemolitionRehabDashboardComponent>;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DemolitionRehabDashboardComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(DemolitionRehabDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render active demolition contracts: West Gold, Tau Mine, and Mine Villages', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('West Gold Plant Decommissioning');
    expect(text).toContain('Tau Mine Heavy Industrial Salvage');
    expect(text).toContain('Mine Villages Historical Rehab');
  });

  it('should display BOQ margin and salvage credit metrics with interactive hints', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Blended BOQ Margin');
    expect(text).toContain('Salvage Recovery Credit');
    expect(text).toContain('Environmental Clearance');
    expect(text).toContain('Trace 56.6% Formula');
    expect(text).toContain('Audit 3 Contracts');
  });

  it('should open stat drilldown modal when clicking stat cards', () => {
    expect(component.statModalType()).toBeNull();

    component.openStatDrilldown('margin');
    fixture.detectChanges();

    expect(component.statModalType()).toBe('margin');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Mathematical Derivation');
    expect(text).toContain('Gross Certified Billings');
    expect(text).toContain('Salvage Credit Offset');
  });

  it('should open contract detail drilldown modal when clicking a contract card', () => {
    expect(component.selectedContract()).toBeNull();

    const westGold = component.summary().activeContracts[0];
    component.openContractDetail(westGold);
    fixture.detectChanges();

    expect(component.selectedContract()?.id).toBe('DEM-01');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('BOQ Breakdown');
    expect(text).toContain('Section 1: Asbestos & Hazardous Waste Abatement');
    expect(text).toContain('Heavy Steel Superstructure Demolition');

    // Switch to claims tab
    component.activeContractTab.set('claims');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('WG-PC-01');

    // Switch to salvage tab
    component.activeContractTab.set('salvage');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('WB-WG-26-041');

    // Switch to compliance tab
    component.activeContractTab.set('compliance');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('DMRE-NC-2026-089');
  });

  it('should open waybill register modal when clicking chain of custody protocol', () => {
    expect(component.showWaybillModal()).toBeFalse();

    component.showWaybillModal.set(true);
    fixture.detectChanges();

    expect(component.showWaybillModal()).toBeTrue();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Chain of Custody Protocol: Scrap Metal Waybill & Weighbridge Register');
    expect(text).toContain('412t Steel Dispatched');
  });
});
