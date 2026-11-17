import type { OrderStatus } from '../domain/order-status.js';
import type { AdminUserRole } from '../controllers/admin-inventory.controller.js';

export interface BulkStatusItem { orderId: string; version: string; packageCount?: number; }
export interface BulkStatusRequest {
  items: BulkStatusItem[];
  targetStatus: OrderStatus;
  adminUserId: string;
  adminRole?: AdminUserRole;
}
export interface BulkStatusResultItem {
  orderId: string;
  ok: boolean;
  orderNumber?: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  reason?: string;
}
export interface OrderStatusRepository { applyBulkStatus(request: BulkStatusRequest): Promise<BulkStatusResultItem[]>; }
export interface OrderStatusService { applyBulkStatus(request: BulkStatusRequest): Promise<BulkStatusResultItem[]>; }
