import { Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CostingRates,
  PhaseScopeItem,
  ProjectCostingModel,
  DEFAULT_COSTING_RATES,
  PRESET_WEST_GOLD,
  PRESET_SENATLA_VILLAGES,
  PRESET_CAPM_TAU_MINE,
  calculateWaterfall,
  generateCashflowSchedule,
  exportModelAsCSV,
} from '../../core/services/costing-model.engine';

@Component({
  selector: 'app-costing-model',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './costing-model.component.html',
  styleUrls: ['./costing-model.component.scss'],
})
export class CostingModelComponent {
  // Active Project State
  projectName = signal<string>(PRESET_SENATLA_VILLAGES.projectName);
  clientName = signal<string>(PRESET_SENATLA_VILLAGES.clientName);
  contractRef = signal<string>(PRESET_SENATLA_VILLAGES.contractRef);
  durationMonths = signal<number>(PRESET_SENATLA_VILLAGES.durationMonths);
  activePresetId = signal<string>(PRESET_SENATLA_VILLAGES.id);

  // Rates & Commercial Multipliers
  rates = signal<CostingRates>({ ...DEFAULT_COSTING_RATES });

  // Phase Scope List
  phases = signal<PhaseScopeItem[]>([
    ...PRESET_SENATLA_VILLAGES.phases.map(p => ({ ...p })),
  ]);

  // UI state
  activeTab = signal<'waterfall' | 'boq' | 'phases' | 'cashflow' | 'rates'>('waterfall');
  showRatesDrawer = signal<boolean>(false);
  notification = signal<string | null>(null);

  // New Phase Form State
  newPhaseName = '';
  newPhaseArea = 10000;
  newPhaseStructures = 2;
  newPhaseConcrete = 500;
  newPhaseDuration = 2;

  // Computed Calculations
  calculation = computed(() => {
    return calculateWaterfall(this.phases(), this.rates(), this.durationMonths());
  });

  waterfall = computed(() => this.calculation().waterfall);
  phaseDetails = computed(() => this.calculation().phaseDetails);

  cashflow = computed(() => {
    return generateCashflowSchedule(this.waterfall(), this.durationMonths());
  });

  totalFootprint = computed(() => {
    return this.phases().reduce((acc, p) => acc + (p.footprint_m2 || 0), 0);
  });

  totalStructures = computed(() => {
    return this.phases().reduce((acc, p) => acc + (p.structures || 0), 0);
  });

  totalConcrete = computed(() => {
    return this.phases().reduce((acc, p) => acc + (p.concrete_m3 || 0), 0);
  });

  totalRubble = computed(() => {
    return this.phaseDetails().reduce((acc, p) => acc + (p.rubble_tons || 0), 0);
  });

  // Preset Loaders
  loadPreset(presetType: 'village' | 'westgold' | 'tau10' | 'blank') {
    let target: ProjectCostingModel;
    if (presetType === 'village') {
      target = PRESET_SENATLA_VILLAGES;
    } else if (presetType === 'westgold') {
      target = PRESET_WEST_GOLD;
    } else if (presetType === 'tau10') {
      target = PRESET_CAPM_TAU_MINE;
    } else {
      target = {
        id: 'custom-blank',
        projectName: 'New Demolition & Rehabilitation Proposal',
        clientName: 'Senatla Trading Enterprise 26',
        contractRef: `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        durationMonths: 6,
        rates: { ...DEFAULT_COSTING_RATES },
        phases: [
          { id: 'p-1', name: 'Zone 1 - Main Operational Site', footprint_m2: 12000, structures: 3, concrete_m3: 850, duration_months: 2 },
        ],
      };
    }

    this.activePresetId.set(target.id);
    this.projectName.set(target.projectName);
    this.clientName.set(target.clientName);
    this.contractRef.set(target.contractRef);
    this.durationMonths.set(target.durationMonths);
    this.rates.set({ ...target.rates });
    this.phases.set(target.phases.map(p => ({ ...p })));

    this.showNotify(`Loaded template: ${target.projectName}`);
  }

  // Phase Manipulation
  addPhase() {
    if (!this.newPhaseName.trim()) return;

    const newPhase: PhaseScopeItem = {
      id: `p-${Date.now()}`,
      name: this.newPhaseName.trim(),
      footprint_m2: Number(this.newPhaseArea) || 0,
      structures: Number(this.newPhaseStructures) || 0,
      concrete_m3: Number(this.newPhaseConcrete) || 0,
      duration_months: Number(this.newPhaseDuration) || 1,
    };

    this.phases.update(list => [...list, newPhase]);
    this.newPhaseName = '';
    this.showNotify(`Added phase: ${newPhase.name}`);
  }

  removePhase(index: number) {
    this.phases.update(list => list.filter((_, idx) => idx !== index));
    this.showNotify('Phase removed');
  }

  updatePhaseField(index: number, field: keyof PhaseScopeItem, value: any) {
    this.phases.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  updateRate(field: keyof CostingRates, value: number) {
    this.rates.update(r => ({ ...r, [field]: Number(value) }));
  }

  exportCSV() {
    const model: ProjectCostingModel = {
      id: this.activePresetId(),
      projectName: this.projectName(),
      clientName: this.clientName(),
      contractRef: this.contractRef(),
      durationMonths: this.durationMonths(),
      rates: this.rates(),
      phases: this.phases(),
    };

    const csvContent = exportModelAsCSV(model, this.waterfall(), this.phaseDetails());
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.projectName().replace(/[^a-zA-Z0-9]/g, '_')}_Model.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showNotify('Exported model to CSV / Excel sheet');
  }

  printProposal() {
    window.print();
  }

  private showNotify(msg: string) {
    this.notification.set(msg);
    setTimeout(() => {
      if (this.notification() === msg) {
        this.notification.set(null);
      }
    }, 3500);
  }
}
