import type { DashboardScopeId } from '../../../core/models/dashboard-scope.models';
import type { EngineeringOrderRecord } from '../../../core/models/domain-dashboard.models';

interface EngineeringOrderFilters {
  search: string;
  scope: DashboardScopeId | '';
  statuses: readonly string[];
  sortKey: string;
}

export function filterEngineeringOrders(
  orders: readonly EngineeringOrderRecord[],
  filters: EngineeringOrderFilters,
): EngineeringOrderRecord[] {
  if (filters.scope && filters.scope !== 'engineering') {
    return [];
  }

  const term = filters.search.trim().toLowerCase();
  const matchingOrders = orders.filter((order) => {
    if (filters.statuses.length && !filters.statuses.includes(order.status)) {
      return false;
    }
    if (!term) return true;

    const searchableText = [order.poNumber, order.jobCardNumber, order.client, order.scopeDescription, order.workshop]
      .join(' ')
      .toLowerCase();
    return searchableText.includes(term);
  });

  return matchingOrders.sort((left, right) => {
    switch (filters.sortKey) {
      case 'value_desc': return right.value - left.value;
      case 'value_asc': return left.value - right.value;
      case 'job_card': return left.jobCardNumber.localeCompare(right.jobCardNumber);
      case 'status': return left.status.localeCompare(right.status);
      default: return right.id.localeCompare(left.id);
    }
  });
}
