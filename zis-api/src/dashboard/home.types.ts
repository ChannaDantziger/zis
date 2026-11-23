import type { OrderStatus } from '../domain/order-status.js';

export interface HomeItem {
  orderItemId: string; productName: string; variantName: string; quantitySets: number;
  categoryName: string; productId: string | null; productVariantId: string | null;
  imagePath: string | null; imageUrl: string | null;
}

export interface HomeOrder {
  orderId: string; orderNumber: string; status: OrderStatus; paymentStatus: string; isTest?: boolean;
  deliveryDate: string; city: string; address: string; zoneName: string | null; version: string; packageCount: number | null;
  items: HomeItem[];
}

export interface HomeOrdersResponse { from: string; to: string; orders: HomeOrder[]; }
export interface HomeOrderRepository { list(from: string, to: string): Promise<HomeOrder[]>; }
export interface HomeService { listOrders(from: string, to: string): Promise<HomeOrdersResponse>; }
