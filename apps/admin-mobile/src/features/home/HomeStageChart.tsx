import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { request } from '../../shared/api/http-client.js';
import { OrderStatusBadge, statusColors, statusIcons, statusLabels } from '../../shared/components/OrderStatusBadge.js';
import type { OrderStatus } from '../../entities/admin.types.js';
import type { HomeOrder } from './home.types.js';
import { PackageCountDialog } from './PackageCountDialog.js';
import { Link } from 'react-router-dom';

const STAGES: OrderStatus[] = ['ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved'];
const NEXT: Partial<Record<OrderStatus, [OrderStatus, string]>> = {
  ordered: ['in_preparation', 'התחלת הכנה'], in_preparation: ['packed', 'סיום אריזה'],
  packed: ['in_transit', 'יציאה למשלוח'], in_transit: ['delivered', 'סימון כנמסרה'],
  delivered: ['approved', 'סגירת הזמנה'],
};

export function HomeStageChart({ orders, date, selected, onSelect, onOpen }: {
  orders: HomeOrder[]; date: string; selected: OrderStatus; onSelect: (status: OrderStatus) => void; onOpen: (id: string) => void;
}) {
  const client = useQueryClient();
  const [packageOrder, setPackageOrder] = useState<HomeOrder | null>(null);
  const mutation = useMutation({
    mutationFn: ({ order, packageCount }: { order: HomeOrder; packageCount?: number }) => request<{ results: Array<{ ok: boolean; reason?: string }> }>('/admin/orders/bulk-status', {
      method: 'POST', body: JSON.stringify({ targetStatus: NEXT[order.status]?.[0], items: [{ orderId: order.orderId, version: order.version, ...(packageCount ? { packageCount } : {}) }] }),
    }),
    onSuccess: async data => { if (data.results.every(result => result.ok)) setPackageOrder(null);
      await Promise.all(['home-orders', 'dashboard', 'orders', 'production', 'order-details'].map(key => client.invalidateQueries({ queryKey: [key] }))); },
  });
  const counts = Object.fromEntries([...STAGES, 'cancelled'].map(status => [status, orders.filter(order => order.status === status).length])) as Record<OrderStatus, number>;
  const visible = orders.filter(order => order.status === selected);
  const total = orders.filter(order => order.status !== 'cancelled').length;
  const failure = mutation.data?.results.find(result => !result.ok);
  return <Card withBorder radius="lg" className="home-panel" id="home-stages">
    <Group justify="space-between" mb="md"><div><Title order={2}>הזמנות לפי שלב</Title><Text size="sm" c="dimmed">היום · בחרי שלב כדי לראות את ההזמנות</Text></div><Group><Text fw={700}>{total} פעילות</Text>
      <Button component={Link} to={`/packing?${new URLSearchParams({ date })}`} variant="default">תוויות אריזה</Button>
      <Button component={Link} to={`/delivery?${new URLSearchParams({ date })}`} variant="default">דוח יציאות להיום</Button>
    </Group></Group>
    <div className="home-stage-bar" aria-label="חלוקת הזמנות לפי שלב">{STAGES.filter(status => counts[status]).map(status =>
      <button key={status} type="button" style={{ flexGrow: counts[status], background: statusColors[status] }}
        aria-label={`${statusLabels[status]}: ${counts[status]} הזמנות`} aria-pressed={selected === status} onClick={() => onSelect(status)}>{counts[status]}</button>)}</div>
    <div className="home-stage-legend">{[...STAGES, ...(counts.cancelled ? ['cancelled' as const] : [])].map(status => {
      const Icon = statusIcons[status];
      return <button key={status} type="button" className="home-stage-choice" style={{ color: statusColors[status] }}
        aria-pressed={selected === status} onClick={() => onSelect(status)}><Icon size={18} />{statusLabels[status]} <b>{counts[status]}</b></button>;
    })}</div>
    <div className="home-stage-results"><Title order={3}>{statusLabels[selected]} · {visible.length} הזמנות</Title>
      {mutation.isError && <Alert color="red" mt="sm">{mutation.error.message}</Alert>}
      {failure && <Alert color="red" mt="sm">המעבר לא בוצע: {failure.reason ?? 'יש לרענן ולנסות שוב'}</Alert>}
      {!visible.length ? <Text c="dimmed" py="md">אין הזמנות בשלב זה היום.</Text> :
        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">{visible.map(order => <Card key={order.orderId} withBorder radius="md" className="home-order-card" style={{ borderInlineStart: `4px solid ${statusColors[order.status]}` }}>
          <Group justify="space-between"><Text fw={700}>{order.orderNumber}</Text><OrderStatusBadge order={order} /></Group>
          <Stack gap="xs" mt="sm" className="home-order-products">{order.items.length ? order.items.map(item => <Group key={item.orderItemId} wrap="nowrap" gap="sm" className="home-order-product">
            {item.imageUrl ? <img className="home-thumb" src={item.imageUrl} alt={item.productName} /> : <div className="home-thumb home-thumb-empty" role="img" aria-label={`אין תמונה ל${item.productName}`}>אין תמונה</div>}
            <div><Text size="sm" fw={600}>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</Text><Text size="xs" c="dimmed">{item.quantitySets} סטים</Text></div>
          </Group>) : <Text size="sm" c="dimmed">אין פריטי מוצר בהזמנה</Text>}
            <Text size="xs" c="dimmed">{summary(order)}</Text><Text size="xs" c="dimmed">{order.city} · {order.address}</Text></Stack>
          <Group justify="space-between" mt="sm"><Button variant="subtle" size="sm" onClick={() => onOpen(order.orderId)}>פרטים</Button>
            {NEXT[order.status] && (order.status !== 'ordered' || order.paymentStatus === 'paid') &&
              <Button size="sm" color={statusColors[NEXT[order.status]![0]]} loading={mutation.isPending}
                onClick={() => order.status === 'packed' ? (setPackageOrder(order), mutation.reset()) : window.confirm(`לאשר העברה של הזמנה ${order.orderNumber} לסטטוס "${statusLabels[NEXT[order.status]![0]]}"?`) && mutation.mutate({ order })}>{NEXT[order.status]![1]}</Button>}
            {order.status === 'ordered' && order.paymentStatus !== 'paid' && <Text size="xs" c="dimmed">הכנה לאחר תשלום</Text>}</Group>
        </Card>)}</SimpleGrid>}
    </div>
    {packageOrder && <PackageCountDialog key={packageOrder.orderId} initialCount={packageOrder.packageCount}
      targetLabel={NEXT[packageOrder.status]?.[1] ?? 'שמירה'} pending={mutation.isPending}
      error={mutation.isError ? mutation.error.message : mutation.data?.results.find(result => !result.ok)?.reason}
      onClose={() => setPackageOrder(null)} onConfirm={packageCount => mutation.mutate({ order: packageOrder, packageCount })} />}
  </Card>;
}

function summary(order: HomeOrder): string {
  if (order.status === 'ordered') return order.paymentStatus === 'paid' ? 'שולמה · ממתינה להכנה' : 'ממתינה לתשלום';
  if (order.status === 'in_preparation') return order.items.map(item => `${item.productName} · ${item.quantitySets} סטים`).join(', ');
  if (order.status === 'packed') return `${order.packageCount ?? 'לא צוין מספר'} מארזים · ליציאה`;
  if (order.status === 'in_transit') return `${order.packageCount ?? 'לא צוין מספר'} מארזים · בדרך אל ${order.address}`;
  return order.items.map(item => item.productName).join(', ');
}
