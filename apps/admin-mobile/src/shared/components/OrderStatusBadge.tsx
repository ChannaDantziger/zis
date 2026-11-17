import { Badge } from '@mantine/core';
import { IconBox, IconCheck, IconClock, IconCircleX, IconFileText, IconTruck, IconChecks } from '@tabler/icons-react';
import type { OrderPreview, OrderStatus } from '../../entities/admin.types.js';

export const statusLabels: Record<OrderStatus, string> = {
  ordered: 'התקבלה', in_preparation: 'בהכנה', packed: 'נארזה',
  in_transit: 'יצאה', delivered: 'נמסרה', approved: 'נסגרה', cancelled: 'בוטלה',
};

export const statusColors: Record<OrderStatus, string> = {
  ordered: '#88601a', in_preparation: '#a04e26', packed: '#6e673a',
  in_transit: '#4c6c80', delivered: '#3f7255', approved: '#60412f', cancelled: '#a3443d',
};
export const statusIcons = {
  ordered: IconFileText, in_preparation: IconClock, packed: IconBox,
  in_transit: IconTruck, delivered: IconCheck, approved: IconChecks, cancelled: IconCircleX,
} satisfies Record<OrderStatus, typeof IconBox>;

export function OrderStatusBadge({ order }: { order: Pick<OrderPreview, 'status' | 'paymentStatus'> }) {
  const Icon = statusIcons[order.status];
  return <Badge variant="light" color={statusColors[order.status]} leftSection={<Icon size={14} />}>{statusLabels[order.status]}</Badge>;
}
