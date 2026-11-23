import { Alert, Button, Stack } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDetails } from '../../entities/admin.types.js';
import { request } from '../../shared/api/http-client.js';

// Temporary test-only payment approval; review its removal before production release.
export function TestPaymentButton({ order }: { order: Pick<OrderDetails, 'orderId' | 'orderNumber' | 'version' | 'status' | 'paymentStatus' | 'isTest'> }) {
  const client = useQueryClient();
  const approval = useMutation({
    mutationFn: () => request(`/admin/test-orders/${encodeURIComponent(order.orderId)}/approve-payment`, {
      method: 'POST', body: JSON.stringify({ expectedVersion: order.version, reason: 'אישור תשלום מדומה ממסך הניהול' }),
    }),
    onSuccess: async () => {
      await Promise.all(['order-details', 'orders', 'orders-status-count', 'home-orders', 'dashboard', 'production']
        .map(key => client.invalidateQueries({ queryKey: [key] })));
    },
  });
  if (!order.isTest || order.status !== 'ordered' || order.paymentStatus !== 'pending') return null;
  return <Stack gap="xs">
    <Button loading={approval.isPending} onClick={() => {
      if (window.confirm(`לאשר תשלום מדומה להזמנת ניסוי ${order.orderNumber}? לא יתבצע חיוב, והמלאי יופחת.`)) approval.mutate();
    }}>סימון כשולמה · ניסוי ללא חיוב</Button>
    {approval.isError && <Alert color="red" role="alert">{approval.error.message}</Alert>}
  </Stack>;
}
