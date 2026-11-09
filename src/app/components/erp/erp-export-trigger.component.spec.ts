import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpExportTriggerComponent } from './erp-export-trigger.component';

describe('ErpExportTriggerComponent', () => {
  let fixture: ComponentFixture<ErpExportTriggerComponent>;
  let component: ErpExportTriggerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpExportTriggerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpExportTriggerComponent);
    component = fixture.componentInstance;
  });

  it('toggles menu when button is clicked', () => {
    fixture.detectChanges();
    expect(component.menuOpen()).toBeFalse();

    component.toggleMenu();
    expect(component.menuOpen()).toBeTrue();
  });

  it('emits exportRequested with selected format', () => {
    fixture.detectChanges();
    spyOn(component.exportRequested, 'emit');

    component.triggerExport('xlsx');
    expect(component.exportRequested.emit).toHaveBeenCalledWith('xlsx');
    expect(component.menuOpen()).toBeFalse();
  });

  it('disables trigger when busy is true', () => {
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Exporting...');
  });
});
