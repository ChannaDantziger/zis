import type { OrderStatus } from '../../entities/admin.types.js';

export interface HomeItem {
  orderItemId: string; productName: string; quantitySets: number;
  categoryName: string; productId: string | null;
  imageUrl: string | null;
}
export interface HomeOrder {
  orderId: string; orderNumber: string; status: OrderStatus; paymentStatus: string; isTest?: boolean;
  deliveryDate: string; city: string; address: string; zoneName: string | null; version: string; packageCount: number | null;
  items: HomeItem[];
  bundles?: Array<{ orderBundleId: string; bundleName: string; quantity: number;
    components: Array<{ productId: string; productName: string; quantity: number }> }>;
}
export interface HomeOrdersResponse { from: string; to: string; orders: HomeOrder[]; }
export type TaskStage = 'open' | 'in_progress' | 'closed';
export interface HomeTaskEvent { status: TaskStage; note: string | null; createdAt: string; }
export interface HomeTask {
  taskId: string; source: 'manual' | 'system'; title: string; description: string | null;
  status: TaskStage; orderId: string | null; version: string; createdAt: string;
  history: HomeTaskEvent[];
}
