import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainDashboardService } from '../../core/services/domain-dashboard.service';
import { DomainNavigationSwitcherComponent } from './domain-navigation-switcher/domain-navigation-switcher.component';
import { EngineeringDashboardComponent } from './engineering-dashboard/engineering-dashboard.component';
import { DemolitionRehabDashboardComponent } from './demolition-rehab-dashboard/demolition-rehab-dashboard.component';
import { OverallMacroDashboardComponent } from './overall-macro-dashboard/overall-macro-dashboard.component';
import { UndergroundWorksDashboardComponent } from './underground-works-dashboard/underground-works-dashboard.component';

@Component({
  selector: 'app-multi-domain-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DomainNavigationSwitcherComponent,
    EngineeringDashboardComponent,
    DemolitionRehabDashboardComponent,
    OverallMacroDashboardComponent,
    UndergroundWorksDashboardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Domain Navigation Switcher Bar -->
      <app-domain-navigation-switcher></app-domain-navigation-switcher>

      <!-- Active Domain Content Views -->
      @switch (service.activeDomain()) {
        @case ('overall_macro') {
          <app-overall-macro-dashboard></app-overall-macro-dashboard>
        }
        @case ('engineering') {
          <app-engineering-dashboard></app-engineering-dashboard>
        }
        @case ('demolition_rehabilitation') {
          <app-demolition-rehab-dashboard></app-demolition-rehab-dashboard>
        }
        @case ('underground_works') {
          <app-underground-works-dashboard></app-underground-works-dashboard>
        }
      }
    </div>
  `,
})
export class MultiDomainDashboardComponent {
  readonly service = inject(DomainDashboardService);
}
