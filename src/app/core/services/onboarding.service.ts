import { Injectable } from '@angular/core';
import { AppRole } from '../models/app.models';

export type OnboardingFeature = {
  title: string;
  summary: string;
  action: string;
  route?: string;
  tab?: string;
  target?: string;
  query?: Record<string, string>;
};

const STORAGE_KEY = 'senatla_ops_onboarding_v1';
const PREFERENCE_KEY = 'senatla_ops_onboarding_preferences_v2';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  readonly featuresByRole: Record<AppRole, OnboardingFeature[]> = {
    site: [
      { title: 'Confirm the site first', summary: 'Start every shift by confirming the current site, capturing GPS, and describing the planned work targets for today.', action: 'Do this before the safety talk so attendance starts from the right location and operating plan.', route: '/site-manager', query: { siteTab: 'setup' } },
      { title: 'Log trips away from site', summary: 'When an asset or vehicle leaves the submitted site, capture the current KM, GPS, reason, and any custom instruction.', action: 'Use the trip-away panel for fuel, delivery, collection, maintenance, breakdown support, client instruction, or other reasons.', route: '/site-manager', query: { siteTab: 'operations' } },
      { title: 'Complete safety before attendance', summary: 'The safety lock still protects attendance, but it now comes after site and target confirmation.', action: 'Select the toolbox topic, add notes if needed, then unlock attendance.', route: '/site-manager', query: { siteTab: 'safety' } },
      { title: 'Capture attendance evidence', summary: 'Present attendance can include photo and GPS proof, with absence reasons and comments captured per employee.', action: 'Review exceptions before syncing the daily register.', route: '/site-manager', query: { siteTab: 'attendance' } },
      { title: 'Register assets where they work', summary: 'Capture serial numbers, asset identifiers, number plates, licence discs, evidence photos, and site assignment from the field.', action: 'Use Asset Register when a machine, vehicle, or tool arrives on site.', route: '/asset-register' },
      { title: 'Sync with signature', summary: 'Final sync records attendance totals, flagged entries, evidence count, timing status, and the site-manager signature.', action: 'Sign only after the site day, trips, safety and attendance are accurate.', route: '/site-manager', query: { siteTab: 'signoff' } },
    ],
    office: [
      { title: 'Control operational records', summary: 'Manage users, sites, employees, payroll controls, and the asset register from one workspace.', action: 'Open Office Admin for back-office maintenance and audit follow-up.', route: '/office-admin', query: { tourTab: 'overview' } },
      { title: 'Verify captured assets', summary: 'Review OCR-assisted asset entries, compliance dates, custodians, and supporting images before saving.', action: 'Use the verified checkbox only after the evidence and fields agree.', route: '/asset-register' },
      { title: 'Keep the audit trail clean', summary: 'Every sensitive admin and asset action is recorded for review and release readiness.', action: 'Use approvals and activity history before making irreversible changes.', route: '/office-admin', query: { tourTab: 'activity' } },
    ],
    director: [
      { title: 'Read the operating picture', summary: 'Use Director for executive visibility across compliance, risk, cost, and operational status.', action: 'Start here when reviewing cross-site trends and blockers.', route: '/director', target: '[data-tour="director-overview"]' },
      { title: 'Open the detail behind a signal', summary: 'The dashboard shows the summary first, with source-backed review queues, site cards, cost views, and operational risks below.', action: 'Scroll through the dashboard and open a review pack when you need the underlying records.', route: '/director', target: '[data-tour="director-review-queue"]' },
      { title: 'Manage employees', summary: 'Directors can use the shared administration workspace to inspect, update, activate, deactivate, and assign employees.', action: 'Open People in Office Admin for the full employee register.', route: '/office-admin', tab: 'people', target: '[data-tour="admin-people"]', query: { tourTab: 'people' } },
      { title: 'Assign employees to sites', summary: 'Bulk assignment is reviewed before it is applied and remains recorded in the audit trail.', action: 'Select employees, choose a site, review the readiness result, then accept or reject the assignment.', route: '/office-admin', tab: 'people', target: '[data-tour="employee-site-assignment"]', query: { tourTab: 'people' } },
      { title: 'Manage sites and assets', summary: 'Directors can maintain site records and the organization asset register with the same controlled workflows as Office Admin.', action: 'Use Sites and Assets when oversight needs an operational change.', route: '/office-admin', tab: 'assets', target: '[data-tour="admin-assets"]', query: { tourTab: 'assets' } },
      { title: 'Use asset OCR', summary: 'Capture or upload asset evidence, review extracted values, correct anything that is wrong, and verify before saving.', action: 'Open Advanced Intake & Evidence from Assets when a document or licence disc needs OCR assistance.', route: '/asset-register', target: '[data-tour="asset-ocr"]' },
      { title: 'Get help and sign out safely', summary: 'Help is always available in the header. Sign out shows a progress state and gives you a retry option if the network is slow.', action: 'Use the information icon whenever you need the tour or plain-language troubleshooting.', route: '/director', target: '[data-tour="workspace-help"]' },
    ],
  };

  featuresFor(role: AppRole | null | undefined) {
    return role ? this.featuresByRole[role] : [];
  }

  isComplete(userId: string | null | undefined, role: AppRole | null | undefined) {
    if (!userId || !role) return false;
    return this.completedKeys().has(this.keyFor(userId, role));
  }

  shouldAutoOpen(userId: string | null | undefined, role: AppRole | null | undefined) {
    if (!userId || !role) return false;
    return role === 'director' ? !this.isSuppressed(userId, role) : !this.isComplete(userId, role);
  }

  complete(userId: string, role: AppRole, suppressFuture = false) {
    const keys = this.completedKeys();
    keys.add(this.keyFor(userId, role));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
    if (suppressFuture) this.setSuppressed(userId, role, true);
  }

  reset(userId: string, role: AppRole) {
    const keys = this.completedKeys();
    keys.delete(this.keyFor(userId, role));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
    this.setSuppressed(userId, role, false);
  }

  isSuppressed(userId: string | null | undefined, role: AppRole | null | undefined) {
    if (!userId || !role) return false;
    return this.preferenceKeys().has(this.keyFor(userId, role));
  }

  private setSuppressed(userId: string, role: AppRole, value: boolean) {
    const keys = this.preferenceKeys();
    const key = this.keyFor(userId, role);
    if (value) keys.add(key); else keys.delete(key);
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify([...keys]));
  }

  private preferenceKeys() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREFERENCE_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []);
    } catch {
      return new Set<string>();
    }
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
