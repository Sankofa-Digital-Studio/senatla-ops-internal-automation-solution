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

  it('should render Harmony Gold client order pipeline', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('HAR-PO-2026-8812');
    expect(text).toContain('JC-ENG-204');
  });

  it('should open order drilldown modal when an order is selected', () => {
    expect(component.selectedOrder()).toBeNull();
    const order = service.engineeringOrders()[0];
    component.selectedOrder.set(order);
    fixture.detectChanges();

    expect(component.selectedOrder()?.poNumber).toBe(order.poNumber);
    expect(fixture.nativeElement.textContent).toContain('Full Traceability Chain');
    expect(fixture.nativeElement.textContent).toContain(order.quoteNumber);
  });

  it('should open profit metric modal when clicking dividend or revenue cards', () => {
    expect(component.selectedProfitMetric()).toBeNull();
    component.selectedProfitMetric.set('shareholder');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Shareholders Return 30% Dividend Pool');
    expect(fixture.nativeElement.textContent).toContain('Current Distribution Status');
  });
});
