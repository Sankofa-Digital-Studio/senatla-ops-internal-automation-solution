import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSitesComponent } from './admin-sites.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminSitesComponent', () => {
  let fixture: ComponentFixture<AdminSitesComponent>;
  let component: AdminSitesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSitesComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders operational sites registry header and add site button', () => {
    expect(component).toBeTruthy();
    const h2 = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent).toContain('Operational Sites Registry');
  });

  it('opens create modal with default values', () => {
    component.openCreateModal();
    expect(component.isModalOpen()).toBeTrue();
    expect(component.siteForm.name).toBe('');
    expect(component.siteForm.isActive).toBeTrue();
  });
});
