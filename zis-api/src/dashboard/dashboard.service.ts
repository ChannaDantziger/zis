import { ApiError } from '../http/api-error.js';
import { ORDER_STATUSES, type OrderStatus } from '../domain/order-status.js';
import type { AdminOrdersQuery, DashboardRepository, DashboardService } from './dashboard.types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SORT_FIELDS = ['status', 'product', 'location', 'orderNumber', 'total'] as const;

export function createDashboardService(repository: DashboardRepository): DashboardService {
  return {
    getDashboard: (date) => repository.getDashboard(readDate(date)),
    listOrders: (query) => repository.listOrders(normalizeOrdersQuery(query)),
    getProduction: (date) => repository.getProduction(readDate(date)),
  };
}

function normalizeOrdersQuery(query: AdminOrdersQuery): AdminOrdersQuery {
  const normalized = { ...query, deliveryDate: readDate(query.deliveryDate) };
  if (normalized.status && !isOrderStatus(normalized.status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status is invalid');
  }
  if (!SORT_FIELDS.includes(normalized.sortBy)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'sortBy is invalid');
  }
  if (normalized.sortDirection !== 'asc' && normalized.sortDirection !== 'desc') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'sortDirection is invalid');
  }
  return normalized;
}

function readDate(value: string): string {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  }
  return value;
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
