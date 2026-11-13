export type DashboardScopeId = 'head_office' | 'engineering' | 'demolition_rehab' | 'underground';

export interface DashboardScopeOption {
  id: DashboardScopeId;
  label: string;
  description: string;
}

export const DASHBOARD_SCOPE_OPTIONS: readonly DashboardScopeOption[] = [
  { id: 'head_office', label: 'Head Office', description: 'Corporate administration and shared services' },
  { id: 'engineering', label: 'Engineering', description: 'Workshops, fabrication, and job cards' },
  { id: 'demolition_rehab', label: 'Demo & Rehab', description: 'Demolition, rehabilitation, and salvage work' },
  { id: 'underground', label: 'Underground', description: 'Underground works, safety, and consumables' },
];

export function dashboardScopeLabel(scope: DashboardScopeId): string {
  return DASHBOARD_SCOPE_OPTIONS.find((option) => option.id === scope)?.label ?? scope;
}
