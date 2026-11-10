import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { EngineeringDashboardComponent } from './engineering-dashboard.component';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

describe('EngineeringDashboardComponent', () => {
  let component: EngineeringDashboardComponent;
  let fixture: ComponentFixture<EngineeringDashboardComponent>;
  let service: DomainDashboardService;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [EngineeringDashboardComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(EngineeringDashboardComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(DomainDashboardService);
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the 70:30 profit split metrics', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Senatla Share (70%)');
    expect(text).toContain('Shareholders Return (30%)');
    expect(text).toContain('Gross Margin');
  });

  it('should display the anti-inflation expense lock status and allow reconciliation', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Anti-Inflation Integrity Check');
    expect(service.expenseLockStatus()).toBe('locked');

    component.reconcileDraws();
    fixture.detectChanges();

    expect(service.unassignedDrawsCount()).toBe(0);
    expect(service.expenseLockStatus()).toBe('unlocked');
  });

  it('should render Workshops 1, 2, and 3 activities', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Workshop 1: Heavy Boilermaking');
    expect(text).toContain('Workshop 2: Train Wheel Manufacturing');
    expect(text).toContain('Workshop 3: General Assembly & Finishing');
  });

  it('should render Harmony Gold client order pipeline and "+ Capture New Job Card" button', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('HAR-PO-2026-8812');
    expect(text).toContain('JC-ENG-204');
    expect(text).toContain('+ Capture New Job Card');
  });

  it('should open job card detail modal when an order is selected', () => {
    expect(component.selectedOrder()).toBeNull();
    const order = service.engineeringOrders()[0];
    component.openJobCardDetail(order);
    fixture.detectChanges();

    expect(component.selectedOrder()?.poNumber).toBe(order.poNumber);
    expect(fixture.nativeElement.textContent).toContain('Job Card & Commercial Traceability');
    expect(fixture.nativeElement.textContent).toContain(order.quoteNumber);
    expect(fixture.nativeElement.textContent).toContain(order.jobCardNumber);
  });

  it('should display procured materials with vendors, quantities, and totals in job card detail', () => {
    const order = service.engineeringOrders()[0];
    component.openJobCardDetail(order);
    component.jobCardModalTab.set('materials');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Procured Materials & Vendors');
    expect(text).toContain('Scaw Metals');
    expect(text).toContain('En8 Forged Round Bar 180mm');
  });

  it('should display direct artisan labour and hours worked in job card detail', () => {
    const order = service.engineeringOrders()[0];
    component.openJobCardDetail(order);
    component.jobCardModalTab.set('labour');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Artisan Labour & Hours Worked');
    expect(text).toContain('Kobus Van Der Merwe');
    expect(text).toContain('Master Boilermaker');
    expect(text).toContain('36 hrs');
  });

  it('should allow capturing a new procured material item for a job card', () => {
    const order = service.engineeringOrders()[0];
    component.openJobCardDetail(order);
    const initialMaterialCount = order.jobCardDetails?.materials?.length || 0;
    const initialMaterialsCost = order.materialsCost;

    component.materialForm.vendor = 'Columbus Stainless';
    component.materialForm.vendorInvoiceOrPo = 'COL-INV-9921';
    component.materialForm.description = '3CR12 Stainless Steel Plates 12mm';
    component.materialForm.quantity = 5;
    component.materialForm.unit = 'Plates';
    component.materialForm.unitRate = 4200;
    component.materialForm.deliveryNote = 'DN-88319';

    component.submitMaterial();
    fixture.detectChanges();

    const updatedOrder = service.engineeringOrders().find(o => o.id === order.id)!;
    expect(updatedOrder.jobCardDetails?.materials?.length).toBe(initialMaterialCount + 1);
    expect(updatedOrder.materialsCost).toBe(initialMaterialsCost + (5 * 4200));
  });

  it('should allow capturing a new direct labour shift for a job card', () => {
    const order = service.engineeringOrders()[0];
    component.openJobCardDetail(order);
    const initialLabourCount = order.jobCardDetails?.labour?.length || 0;
    const initialLabourCost = order.labourCost;

    component.labourForm.artisanName = 'Thabo Mokoena';
    component.labourForm.role = 'Coded Welder (ASME IX)';
    component.labourForm.hoursWorked = 16;
    component.labourForm.hourlyRate = 380;
    component.labourForm.shiftDate = '2026-11-08';
    component.labourForm.timesheetRef = 'TS-2026-W45-04';

    component.submitLabour();
    fixture.detectChanges();

    const updatedOrder = service.engineeringOrders().find(o => o.id === order.id)!;
    expect(updatedOrder.jobCardDetails?.labour?.length).toBe(initialLabourCount + 1);
    expect(updatedOrder.labourCost).toBe(initialLabourCost + (16 * 380));
  });

  it('should allow removing material and labour items from a job card', () => {
    const order = service.engineeringOrders()[0];
    component.openJobCardDetail(order);
    const firstMaterial = order.jobCardDetails?.materials?.[0];
    const firstLabour = order.jobCardDetails?.labour?.[0];

    expect(firstMaterial).toBeDefined();
    expect(firstLabour).toBeDefined();

    component.deleteMaterial(firstMaterial!.id);
    fixture.detectChanges();

    let updatedOrder = service.engineeringOrders().find(o => o.id === order.id)!;
    expect(updatedOrder.jobCardDetails?.materials?.some(m => m.id === firstMaterial!.id)).toBeFalse();

    component.deleteLabour(firstLabour!.id);
    fixture.detectChanges();

    updatedOrder = service.engineeringOrders().find(o => o.id === order.id)!;
    expect(updatedOrder.jobCardDetails?.labour?.some(l => l.id === firstLabour!.id)).toBeFalse();
  });

  it('should allow creating a new Job Card linked to a Purchase Order', () => {
    const initialOrderCount = service.engineeringOrders().length;
    component.openNewJobCardModal();
    fixture.detectChanges();

    expect(component.showNewJobCardModal()).toBeTrue();

    component.newJobCardForm.poNumber = 'HAR-PO-2026-9042';
    component.newJobCardForm.jobCardNumber = 'JC-ENG-205';
    component.newJobCardForm.description = 'Stope Chute Assembly Fabrication';
    component.newJobCardForm.client = 'Harmony Gold - Doornkop';
    component.newJobCardForm.workshop = 'Workshop 1: Heavy Boilermaking';
    component.newJobCardForm.totalValue = 350000;
    component.newJobCardForm.leadArtisan = 'J. Sithole';
    component.newJobCardForm.materialsCost = 120000;
    component.newJobCardForm.labourCost = 50000;
    component.newJobCardForm.initialMaterialVendor = 'Macsteel VRN';
    component.newJobCardForm.initialMaterialDesc = 'Hardox 450 Wear Plates 16mm';
    component.newJobCardForm.initialMaterialQty = 4;
    component.newJobCardForm.initialMaterialRate = 30000;

    component.submitNewJobCard();
    fixture.detectChanges();

    expect(service.engineeringOrders().length).toBe(initialOrderCount + 1);
    const created = service.engineeringOrders().find(o => o.jobCardNumber === 'JC-ENG-205');
    expect(created).toBeDefined();
    expect(created?.poNumber).toBe('HAR-PO-2026-9042');
    expect(created?.client).toBe('Harmony Gold - Doornkop');
    expect(created?.jobCardDetails?.materials?.length).toBe(1);
    expect(created?.jobCardDetails?.materials?.[0].vendor).toBe('Macsteel VRN');
    expect(component.showNewJobCardModal()).toBeFalse();
  });

  it('should open profit metric modal when clicking dividend or revenue cards', () => {
    expect(component.selectedProfitMetric()).toBeNull();
    component.selectedProfitMetric.set('shareholder');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Shareholders Return 30% Dividend Pool');
    expect(fixture.nativeElement.textContent).toContain('Current Distribution Status');
  });
});
