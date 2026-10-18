import { Injectable } from '@angular/core';
import { AppRole } from '../models/app.models';

export type OnboardingFeature = {
  title: string;
  summary: string;
  action: string;
};

const STORAGE_KEY = 'senatla_ops_onboarding_v1';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  readonly featuresByRole: Record<AppRole, OnboardingFeature[]> = {
    site: [
      { title: 'Confirm the site first', summary: 'Start every shift by confirming the current site, capturing GPS, and describing the planned work targets for today.', action: 'Do this before the safety talk so attendance starts from the right location and operating plan.' },
      { title: 'Log trips away from site', summary: 'When an asset or vehicle leaves the submitted site, capture the current KM, GPS, reason, and any custom instruction.', action: 'Use the trip-away panel for fuel, delivery, collection, maintenance, breakdown support, client instruction, or other reasons.' },
      { title: 'Complete safety before attendance', summary: 'The safety lock still protects attendance, but it now comes after site and target confirmation.', action: 'Select the toolbox topic, add notes if needed, then unlock attendance.' },
      { title: 'Capture attendance evidence', summary: 'Present attendance can include photo and GPS proof, with absence reasons and comments captured per employee.', action: 'Review exceptions before syncing the daily register.' },
      { title: 'Register assets where they work', summary: 'Capture serial numbers, asset identifiers, number plates, licence discs, evidence photos, and site assignment from the field.', action: 'Use Asset Register when a machine, vehicle, or tool arrives on site.' },
      { title: 'Sync with signature', summary: 'Final sync records attendance totals, flagged entries, evidence count, timing status, and the site-manager signature.', action: 'Sign only after the site day, trips, safety and attendance are accurate.' },
    ],
    office: [
      { title: 'Control operational records', summary: 'Manage users, sites, employees, payroll controls, and the asset register from one workspace.', action: 'Open Office Admin for back-office maintenance and audit follow-up.' },
      { title: 'Verify captured assets', summary: 'Review OCR-assisted asset entries, compliance dates, custodians, and supporting images before saving.', action: 'Use the verified checkbox only after the evidence and fields agree.' },
      { title: 'Keep the audit trail clean', summary: 'Every sensitive admin and asset action is recorded for review and release readiness.', action: 'Use approvals and activity history before making irreversible changes.' },
    ],
    director: [
      { title: 'Read the operating picture', summary: 'Use Director for executive visibility across compliance, risk, cost, and operational status.', action: 'Open Director when reviewing cross-site trends and blockers.' },
      { title: 'Approve only with separation', summary: 'Maker-checker controls keep requesters from approving their own sensitive actions.', action: 'Review pending approvals before accepting or rejecting them.' },
      { title: 'Register strategic assets', summary: 'Directors can register organization assets while RLS keeps site users scoped to permitted sites.', action: 'Use Asset Register when executive asset capture is required.' },
    ],
    readonly: [
      { title: 'View your assigned site', summary: 'Your read-only access is limited to information for the site selected by your administrator.', action: 'Use the Read-only workspace to review permitted operations data. Contact your administrator to request changes.' },
      { title: 'Keep records unchanged', summary: 'This account cannot create, update, or delete operational records.', action: 'Ask an office administrator to make any required updates.' },
    ],
  };

  featuresFor(role: AppRole | null | undefined) {
    return role ? this.featuresByRole[role] : [];
  }

  isComplete(userId: string | null | undefined, role: AppRole | null | undefined) {
    if (!userId || !role) return false;
    return this.completedKeys().has(this.keyFor(userId, role));
  }

  complete(userId: string, role: AppRole) {
    const keys = this.completedKeys();
    keys.add(this.keyFor(userId, role));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  }

  reset(userId: string, role: AppRole) {
    const keys = this.completedKeys();
    keys.delete(this.keyFor(userId, role));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  }

  private completedKeys() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []);
    } catch {
      return new Set<string>();
    }
  }

  private keyFor(userId: string, role: AppRole) {
    return `${userId}:${role}`;
  }
}
