import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UndergroundWorksDashboardComponent } from './underground-works-dashboard.component';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

describe('UndergroundWorksDashboardComponent', () => {
  let component: UndergroundWorksDashboardComponent;
  let fixture: ComponentFixture<UndergroundWorksDashboardComponent>;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UndergroundWorksDashboardComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(UndergroundWorksDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the deferred scope executive notice', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Phase 1 Scope Deferred');
    expect(text).toContain('Executive Scope Notice');
    expect(text).toContain('President Steyn Main Shaft');
  });
});
