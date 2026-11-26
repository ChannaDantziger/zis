import { MAX_PAGE_SIZE } from '../contracts/common.contracts.js';
import { ApiError } from '../http/api-error.js';
import { ORDER_STATUSES, type OrderStatus } from '../domain/order-status.js';
import type { AdminOrdersQuery, DashboardRepository, DashboardService } from './dashboard.types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SORT_FIELDS = ['status', 'product', 'location', 'orderNumber', 'total'] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createDashboardService(repository: DashboardRepository, resolveImage?: (path: string) => Promise<string>): DashboardService {
  return {
    getOrder: async (orderId) => {
      if (!UUID_PATTERN.test(orderId)) throw new ApiError(400, 'VALIDATION_ERROR', 'orderId must be a UUID');
      const order = await repository.getOrder(orderId);
      if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      const paths = [...new Set([...order.items.map(item => item.imagePath), ...(order.bundles ?? []).flatMap(bundle => [bundle.imagePath, ...bundle.components.map(item => item.imagePath)])].filter((path): path is string => Boolean(path)))];
      const urls = new Map<string, string>();
      if (resolveImage) await Promise.all(paths.map(async path => { try { urls.set(path, await resolveImage(path)); } catch { /* image is optional */ } }));
      return { ...order, items: order.items.map(({ imagePath, ...item }) => ({ ...item, imageUrl: imagePath ? urls.get(imagePath) ?? null : null })),
        bundles: order.bundles?.map(({ imagePath, components, ...bundle }) => ({ ...bundle, imageUrl: imagePath ? urls.get(imagePath) ?? null : null,
          components: components.map(({ imagePath: path, ...item }) => ({ ...item, imageUrl: path ? urls.get(path) ?? null : null })) })) };
    },
    getDashboard: (date, adminUserId) => repository.getDashboard(readDate(date), adminUserId),
    listOrderPage: (query) => {
      const normalized = normalizeOrdersQuery(query);
      if (!Number.isSafeInteger(query.page) || query.page < 1 || !Number.isSafeInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE || !Number.isSafeInteger((query.page - 1) * query.pageSize)) throw new ApiError(400, 'VALIDATION_ERROR', 'pagination is invalid');
      return repository.listOrderPage({ ...normalized, page: query.page, pageSize: query.pageSize });
    },
    listOrders: (query) => repository.listOrders(normalizeOrdersQuery(query)),
    getProduction: (date) => repository.getProduction(readDate(date)),
  };
}

function normalizeOrdersQuery(query: AdminOrdersQuery): AdminOrdersQuery {
  const normalized = { ...query, deliveryDate: readDate(query.deliveryDate) };
  if (normalized.status && !isOrderStatus(normalized.status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status is invalid');
  }
  if (normalized.paymentFilter && !['pending', 'not_pending'].includes(normalized.paymentFilter)) throw new ApiError(400, 'VALIDATION_ERROR', 'paymentFilter is invalid');
  if (!SORT_FIELDS.includes(normalized.sortBy)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'sortBy is invalid');
  }
  if (normalized.sortDirection !== 'asc' && normalized.sortDirection !== 'desc') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'sortDirection is invalid');
  }
  if (normalized.productVariantId && !UUID_PATTERN.test(normalized.productVariantId)) throw new ApiError(400, 'VALIDATION_ERROR', 'productVariantId must be a UUID');
  return normalized;
}

function readDate(value: string): string {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!DATE_PATTERN.test(value) || Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  }
  return value;
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
