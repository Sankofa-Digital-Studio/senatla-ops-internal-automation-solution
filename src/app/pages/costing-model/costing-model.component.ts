import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ProposalDocument, ProposalLine, ProposalSection, ProposalTemplateId, PROPOSAL_LAYOUTS,
  calculateProposal, createProposal, lineAmount,
} from '../../core/services/proposal-template.engine';
import { createProposalPdf, createProposalWorkbook, proposalFilename } from '../../core/services/proposal-export.service';

@Component({
  selector: 'app-costing-model',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './costing-model.component.html',
  styleUrls: ['./costing-model.component.scss'],
})
export class CostingModelComponent {
  readonly layouts = PROPOSAL_LAYOUTS;
  proposal = signal<ProposalDocument>(createProposal('west-gold'));
  summary = computed(() => calculateProposal(this.proposal()));
  view = signal<'edit' | 'preview'>('edit');
  error = signal<string | null>(null);
  isExporting = signal(false);
  private sequence = 0;

  loadTemplate(id: ProposalTemplateId, select?: HTMLSelectElement) {
    if (id === this.proposal().templateId) return;
    const original = createProposal(this.proposal().templateId);
    if (JSON.stringify(this.proposal()) !== JSON.stringify(original)
      && !window.confirm('Selecting another template will replace the current proposal. Continue?')) {
      if (select) select.value = this.proposal().templateId;
      return;
    }
    this.proposal.set(createProposal(id));
    this.view.set('edit');
    this.error.set(null);
  }

  updateText(field: 'projectName' | 'clientName' | 'contractRef', value: string) {
    this.proposal.update(current => ({ ...current, [field]: value }));
  }

  updateDuration(value: number | null) {
    const parsed = value === null || value === undefined ? null : Number(value);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return this.setError('Duration must be zero or more.');
    this.proposal.update(current => ({ ...current, durationMonths: parsed }));
    this.error.set(null);
  }

  updatePercentage(field: 'pgPct' | 'contingencyPct' | 'profitPct' | 'vatPct', value: number | null) {
    const parsed = value === null || value === undefined ? 0 : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return this.setError('Each percentage must be between 0 and 100.');
    this.proposal.update(current => ({ ...current, [field]: parsed }));
    this.error.set(null);
  }

  addSection() {
    const id = this.nextId();
    this.proposal.update(current => ({ ...current, sections: [...current.sections, {
      id, title: 'New section', lines: [{ id: this.nextId(), itemNo: `${current.sections.length + 1}.1`, description: '', uom: 'lot', quantity: null, rate: null }],
    }] }));
  }

  removeSection(sectionId: string) {
    this.proposal.update(current => ({ ...current, sections: current.sections.filter(section => section.id !== sectionId) }));
  }

  updateSection(sectionId: string, title: string) {
    this.updateSections(section => section.id === sectionId ? { ...section, title } : section);
  }

  addLine(sectionId: string) {
    this.updateSections(section => section.id === sectionId ? {
      ...section, lines: [...section.lines, {
        id: this.nextId(), itemNo: `${this.proposal().sections.indexOf(section) + 1}.${section.lines.length + 1}`,
        description: '', uom: 'lot', quantity: null, rate: null,
      }],
    } : section);
  }

  removeLine(sectionId: string, lineId: string) {
    this.updateSections(section => section.id === sectionId ? { ...section, lines: section.lines.filter(line => line.id !== lineId) } : section);
  }

  updateLineText(sectionId: string, lineId: string, field: 'itemNo' | 'description' | 'uom', value: string) {
    this.updateLine(sectionId, lineId, line => ({ ...line, [field]: value }));
  }

  updateLineNumber(sectionId: string, lineId: string, field: 'quantity' | 'rate', value: number | null) {
    const parsed = value === null || value === undefined ? null : Number(value);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 1e12)) return this.setError('Quantity and rate must be between zero and one trillion.');
    this.updateLine(sectionId, lineId, line => ({ ...line, [field]: parsed }));
    this.error.set(null);
  }

  amount(line: ProposalLine): number | null { return lineAmount(line); }

  async exportFile(kind: 'xlsx' | 'pdf') {
    if (this.isExporting()) return;
    if (!this.proposal().projectName.trim() || !this.proposal().clientName.trim()) return this.setError('Enter a project and client name before export.');
    if (!this.summary().pricedLines) return this.setError('Enter at least one quantity and rate before export.');
    this.isExporting.set(true);
    this.error.set(null);
    try {
      const document = this.proposal();
      const summary = this.summary();
      const blob = kind === 'xlsx' ? await createProposalWorkbook(document, summary) : await createProposalPdf(document, summary);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = proposalFilename(document, kind);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      this.setError(`The ${kind.toUpperCase()} download failed. Please retry.`);
    } finally {
      this.isExporting.set(false);
    }
  }

  private setError(message: string) { this.error.set(message); }
  private nextId() { return `draft-${Date.now()}-${++this.sequence}`; }
  private updateSections(change: (section: ProposalSection) => ProposalSection) {
    this.proposal.update(current => ({ ...current, sections: current.sections.map(change) }));
  }
  private updateLine(sectionId: string, lineId: string, change: (line: ProposalLine) => ProposalLine) {
    this.updateSections(section => section.id === sectionId ? {
      ...section, lines: section.lines.map(line => line.id === lineId ? change(line) : line),
    } : section);
  }
}
