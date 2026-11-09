import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ErpWorkflowStep {
  id: string;
  label: string;
  description?: string;
}

@Component({
  selector: 'app-erp-workflow-stepper',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Workflow progress" class="w-full">
      <ol class="flex items-center justify-between w-full text-xs font-medium text-gray-400">
        @for (step of steps(); track step.id; let i = $index) {
          <li
            class="flex items-center gap-2 flex-1 relative"
            [ngClass]="{
              'text-yellow-400': i === currentStepIndex(),
              'text-emerald-400': i < currentStepIndex(),
              'text-gray-500': i > currentStepIndex()
            }"
          >
            <button
              type="button"
              class="flex items-center gap-2 text-left group focus:outline-none"
              [disabled]="i > maxAccessibleIndex()"
              (click)="selectStep(i)"
            >
              <span
                class="flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold transition-colors"
                [ngClass]="{
                  'bg-yellow-500 text-black border-yellow-500': i === currentStepIndex(),
                  'bg-emerald-950 text-emerald-400 border-emerald-600': i < currentStepIndex(),
                  'bg-gray-900 text-gray-500 border-gray-700': i > currentStepIndex()
                }"
              >
                @if (i < currentStepIndex()) {
                  ✓
                } @else {
                  {{ i + 1 }}
                }
              </span>
              <div class="hidden sm:block">
                <p class="font-semibold leading-tight text-white group-hover:text-yellow-400 transition-colors">
                  {{ step.label }}
                </p>
                @if (step.description) {
                  <p class="text-[10px] text-gray-400 leading-tight">
                    {{ step.description }}
                  </p>
                }
              </div>
            </button>

            @if (i < steps().length - 1) {
              <div
                class="flex-1 h-0.5 mx-3 rounded"
                [ngClass]="{
                  'bg-emerald-600': i < currentStepIndex(),
                  'bg-gray-800': i >= currentStepIndex()
                }"
                aria-hidden="true"
              ></div>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class ErpWorkflowStepperComponent {
  readonly steps = input.required<ErpWorkflowStep[]>();
  readonly currentStepIndex = input<number>(0);
  readonly maxAccessibleIndex = input<number>(999);

  @Output() readonly stepChange = new EventEmitter<number>();

  selectStep(index: number): void {
    if (index <= this.maxAccessibleIndex()) {
      this.stepChange.emit(index);
    }
  }
}
