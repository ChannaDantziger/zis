import type { OrderStatus } from '../domain/order-status.js';

export interface DashboardStatusCount {
  status: OrderStatus;
  count: number;
}

export interface DashboardOrderPreview {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
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

export interface DashboardRepository {
  getDashboard(date: string): Promise<DashboardData>;
  listOrders(query: AdminOrdersQuery): Promise<AdminOrderRow[]>;
  getProduction(date: string): Promise<ProductionSummary[]>;
}

export interface DashboardService {
  getDashboard(date: string): Promise<DashboardData>;
  listOrders(query: AdminOrdersQuery): Promise<AdminOrderRow[]>;
  getProduction(date: string): Promise<ProductionSummary[]>;
}
