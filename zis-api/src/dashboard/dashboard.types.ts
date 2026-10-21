import type { ApiListResponse, PaginationQuery } from '../contracts/common.contracts.js';
import type { OrderStatus } from '../domain/order-status.js';
import type { DeliveryAddress } from '../contracts/commerce.contracts.js';

export interface AdminOrderDetails {
  orderId: string; orderNumber: string; status: OrderStatus; paymentStatus: string;
  deliveryDate: string; total: string; version: string;
  customerName: string; customerPhone: string; customerEmail: string;
  deliveryAddress: DeliveryAddress; venueName: string | null;
  dedicationText: string | null; customerNotes: string | null;
  items: Array<{ orderItemId: string; productName: string; variantName: string; quantitySets: number; unitSetPrice: string; lineTotal: string }>;
  history: Array<{ historyId: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; createdAt: string; note: string | null }>;
  tasks: Array<{ taskId: string; title: string; description: string | null; priority: string }>;
  allowedNextStatuses: OrderStatus[];
}

export interface DashboardStatusCount {
  status: OrderStatus;
  count: number;
}

export interface DashboardOrderPreview {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  paymentStatus?: string;
  location: string;
  itemSummary: string;
  hasOpenTask: boolean;
}

export interface ProductionSummary {
  productVariantId: string;
  productName: string;
  variantName: string;
  imagePath: string | null;
  requiredSets: number;
  orderCount: number;
  hasOpenTask: boolean;
}

export interface DashboardData {
  date: string;
  todayOrderCount: number;
  cancelledOrderCount: number;
  unreadNotificationCount: number;
  openTaskCount?: number;
  statusCounts: DashboardStatusCount[];
  openTasks: Array<{ taskId: string; title: string; priority: string; orderId: string | null }>;
  nextOrders: DashboardOrderPreview[];
  production: ProductionSummary[];
}

export interface AdminOrderRow extends DashboardOrderPreview {
  deliveryDate: string;
  city: string;
  productVariantId: string | null;
  allowedNextStatuses: OrderStatus[];
  version: string;
}

export interface AdminOrdersQuery {
  deliveryDate: string;
  status?: OrderStatus;
  productVariantId?: string;
  location?: string;
  sortBy: 'status' | 'product' | 'location' | 'orderNumber' | 'total';
  sortDirection: 'asc' | 'desc';
}

export interface AdminOrderPageQuery extends AdminOrdersQuery, PaginationQuery {}
export interface AdminOrderPage extends ApiListResponse<AdminOrderRow> { variants: Array<{ value: string; label: string }> }

export interface DashboardRepository {
  getOrder(orderId: string): Promise<AdminOrderDetails | null>;
  getDashboard(date: string, adminUserId?: string): Promise<DashboardData>;
  listOrders(query: AdminOrdersQuery): Promise<AdminOrderRow[]>;
  listOrderPage(query: AdminOrderPageQuery): Promise<AdminOrderPage>;
  getProduction(date: string): Promise<ProductionSummary[]>;
}

export interface DashboardService {
  getOrder(orderId: string): Promise<AdminOrderDetails>;
  getDashboard(date: string, adminUserId?: string): Promise<DashboardData>;
  listOrders(query: AdminOrdersQuery): Promise<AdminOrderRow[]>;
  listOrderPage(query: AdminOrderPageQuery): Promise<AdminOrderPage>;
  getProduction(date: string): Promise<ProductionSummary[]>;
}
