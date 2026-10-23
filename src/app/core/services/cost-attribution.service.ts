import { Injectable, inject, signal } from '@angular/core';
import { CostAttributionReport, CostAttributionRequest } from '../cost-attribution/cost-attribution.models';
import {
  buildCostAttributionReport,
  normalizeCostAttributionRequest,
  parseCostAttributionRows,
} from '../cost-attribution/cost-attribution.validation';
import { COST_ATTRIBUTION_GATEWAY, CostAttributionGateway } from '../gateways/cost-attribution.gateway';

@Injectable({ providedIn: 'root' })
export class CostAttributionService {
  private readonly gateway = inject<CostAttributionGateway>(COST_ATTRIBUTION_GATEWAY);
  private readonly reportState = signal<CostAttributionReport | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private loadSequence = 0;

  readonly report = this.reportState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async loadCosts(request: CostAttributionRequest): Promise<CostAttributionReport> {
    const normalized = normalizeCostAttributionRequest(request);
    const loadId = ++this.loadSequence;
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const rawRows = await this.gateway.reconcile(normalized);
      const report = buildCostAttributionReport(normalized, parseCostAttributionRows(rawRows));
      if (loadId === this.loadSequence) this.reportState.set(report);
      return report;
    } catch (error) {
      if (loadId === this.loadSequence) {
        this.reportState.set(null);
        this.errorState.set(error instanceof Error ? error.message : 'Cost attribution could not be loaded.');
      }
      throw error;
    } finally {
      if (loadId === this.loadSequence) this.loadingState.set(false);
    }
  }

  clear(): void {
    this.loadSequence += 1;
    this.reportState.set(null);
    this.errorState.set(null);
    this.loadingState.set(false);
  }
}
