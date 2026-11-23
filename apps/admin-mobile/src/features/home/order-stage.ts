import type { OrderStatus } from '../../entities/admin.types.js';

export type DisplayStage = OrderStatus | 'payment_pending';

export function displayStage(order: { status: OrderStatus; paymentStatus?: string }): DisplayStage {
  return order.status === 'ordered' && order.paymentStatus === 'pending' ? 'payment_pending' : order.status;
}
