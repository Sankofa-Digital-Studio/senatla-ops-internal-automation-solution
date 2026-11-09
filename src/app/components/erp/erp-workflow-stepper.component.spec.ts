import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpWorkflowStep, ErpWorkflowStepperComponent } from './erp-workflow-stepper.component';

describe('ErpWorkflowStepperComponent', () => {
  let fixture: ComponentFixture<ErpWorkflowStepperComponent>;
  let component: ErpWorkflowStepperComponent;

  const steps: ErpWorkflowStep[] = [
    { id: '1', label: 'Details', description: 'Personal details' },
    { id: '2', label: 'Compliance', description: 'Checks' },
    { id: '3', label: 'Review', description: 'Confirmation' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpWorkflowStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpWorkflowStepperComponent);
    component = fixture.componentInstance;
  });

  it('renders all steps and marks the current active step', () => {
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('currentStepIndex', 1);
    fixture.detectChanges();

    const stepButtons = fixture.nativeElement.querySelectorAll('button');
    expect(stepButtons.length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Details');
    expect(fixture.nativeElement.textContent).toContain('Compliance');
  });

  it('emits stepChange when an accessible step is clicked', () => {
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('currentStepIndex', 1);
    fixture.componentRef.setInput('maxAccessibleIndex', 2);
    fixture.detectChanges();

    spyOn(component.stepChange, 'emit');
    component.selectStep(0);
    expect(component.stepChange.emit).toHaveBeenCalledWith(0);
  });

  it('prevents step selection beyond maxAccessibleIndex', () => {
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('currentStepIndex', 0);
    fixture.componentRef.setInput('maxAccessibleIndex', 0);
    fixture.detectChanges();

    spyOn(component.stepChange, 'emit');
    component.selectStep(2);
    expect(component.stepChange.emit).not.toHaveBeenCalled();
  });
});
