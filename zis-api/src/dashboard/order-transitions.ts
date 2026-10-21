import type { OrderStatus } from '../domain/order-status.js';

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  ordered: 'in_preparation', in_preparation: 'packed', packed: 'in_transit',
  in_transit: 'delivered', delivered: 'approved',
};

export function allowedNextStatuses(status: OrderStatus, paymentStatus?: string): OrderStatus[] {
  if (status === 'ordered' && paymentStatus !== 'paid') return [];
  const next = nextStatus[status];
  return next ? [next] : [];
}
