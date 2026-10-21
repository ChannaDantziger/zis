import { Badge } from '@mantine/core';
import type { OrderPreview, OrderStatus } from '../../entities/admin.types.js';

export const statusLabels: Record<OrderStatus, string> = {
  ordered: 'התקבלה', in_preparation: 'בהכנה', packed: 'נארזה',
  in_transit: 'יצאה', delivered: 'נמסרה', approved: 'נסגרה', cancelled: 'בוטלה',
};

export function OrderStatusBadge({ order }: { order: Pick<OrderPreview, 'status' | 'paymentStatus'> }) {
  const label = order.status === 'ordered' && order.paymentStatus === 'paid' ? 'שולמה' : statusLabels[order.status];
  return <Badge variant="light">{label}</Badge>;
}
