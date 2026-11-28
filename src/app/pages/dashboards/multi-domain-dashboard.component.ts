import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
          @defer (on immediate) {
            <app-engineering-dashboard></app-engineering-dashboard>
          } @loading (after 0ms) {
            <div id="panel-engineering" role="tabpanel" aria-labelledby="tab-engineering">
              <p role="status" class="p-5 text-sm text-gray-300">Loading dashboard…</p>
            </div>
          } @error {
            <div id="panel-engineering" role="tabpanel" aria-labelledby="tab-engineering">
              <p role="alert" class="p-5 text-sm text-red-300">Could not load the dashboard. Refresh the page to try again.</p>
            </div>
          }
        }
        @case ('demolition_rehabilitation') {
          @defer (on immediate) {
            <app-demolition-rehab-dashboard></app-demolition-rehab-dashboard>
          } @loading (after 0ms) {
            <div id="panel-demolition_rehabilitation" role="tabpanel" aria-labelledby="tab-demolition_rehabilitation">
              <p role="status" class="p-5 text-sm text-gray-300">Loading dashboard…</p>
            </div>
          } @error {
            <div id="panel-demolition_rehabilitation" role="tabpanel" aria-labelledby="tab-demolition_rehabilitation">
              <p role="alert" class="p-5 text-sm text-red-300">Could not load the dashboard. Refresh the page to try again.</p>
            </div>
          }
        }
        @case ('underground_works') {
          @defer (on immediate) {
            <app-underground-works-dashboard></app-underground-works-dashboard>
          } @loading (after 0ms) {
            <div id="panel-underground_works" role="tabpanel" aria-labelledby="tab-underground_works">
              <p role="status" class="p-5 text-sm text-gray-300">Loading dashboard…</p>
            </div>
          } @error {
            <div id="panel-underground_works" role="tabpanel" aria-labelledby="tab-underground_works">
              <p role="alert" class="p-5 text-sm text-red-300">Could not load the dashboard. Refresh the page to try again.</p>
            </div>
          }
        }
      }
    </div>
  `,
})
export class MultiDomainDashboardComponent {
  readonly service = inject(DomainDashboardService);
}
