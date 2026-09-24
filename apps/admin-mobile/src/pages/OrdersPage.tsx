import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Checkbox, Group, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import type { BulkStatusResponse, OrderRow, OrderStatus } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { observer } from 'mobx-react-lite';
import { adminUiStore } from '../stores/admin-ui.store.js';

const statusLabels: Record<OrderStatus, string> = { ordered: 'שולמה', in_preparation: 'בהכנה', packed: 'נארזה', in_transit: 'יצאה', delivered: 'נמסרה', approved: 'נסגרה', cancelled: 'בוטלה' };

export const OrdersPage = observer(function OrdersPage() {
  const date = currentBusinessDate();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['orders', date, adminUiStore.statusFilter], queryFn: () => request<OrderRow[]>(`/admin/orders?deliveryDate=${date}${adminUiStore.statusFilter ? `&status=${adminUiStore.statusFilter}` : ''}`) });
  const mutation = useMutation({ mutationFn: (targetStatus: OrderStatus) => request<BulkStatusResponse>('/admin/orders/bulk-status', { method: 'POST', body: JSON.stringify({ targetStatus, items: query.data?.filter((order) => adminUiStore.selectedOrderIds.includes(order.orderId)).map(({ orderId, version }) => ({ orderId, version })) ?? [] }) }), onSuccess: () => { adminUiStore.clearSelection(); client.invalidateQueries({ queryKey: ['orders'] }); client.invalidateQueries({ queryKey: ['dashboard'] }); client.invalidateQueries({ queryKey: ['production'] }); } });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  const orders = query.data;
  const firstNextStatus = orders.find((order) => adminUiStore.selectedOrderIds.includes(order.orderId))?.allowedNextStatuses[0];
  return <Stack gap="lg" maw={900} mx="auto"><Group justify="space-between"><div><Text c="dimmed" size="sm">{date}</Text><Title order={1}>הזמנות היום</Title></div><Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => query.refetch()}>רענון</Button></Group>
    <Group grow><Select label="סינון סטטוס" clearable value={adminUiStore.statusFilter} onChange={(value) => adminUiStore.setStatusFilter(value)} data={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Group>
    {adminUiStore.selectedOrderIds.length > 0 && firstNextStatus && <Card withBorder radius="lg" className="action-bar"><Group justify="space-between"><Text fw={600}>{adminUiStore.selectedOrderIds.length} נבחרו</Text><Button loading={mutation.isPending} rightSection={<IconArrowLeft size={16} />} onClick={() => mutation.mutate(firstNextStatus)}>{statusLabels[firstNextStatus]}</Button></Group>{mutation.data && <Text size="sm" mt="xs">הושלמו {mutation.data.succeeded}, נכשלו {mutation.data.failed}</Text>}</Card>}
    {!orders.length ? <EmptyState>אין הזמנות לתאריך זה</EmptyState> : <Stack>{orders.map((order) => <OrderRowCard key={order.orderId} order={order} checked={adminUiStore.selectedOrderIds.includes(order.orderId)} onChange={(checked) => adminUiStore.toggleOrder(order.orderId, checked)} />)}</Stack>}
  </Stack>;
});

function OrderRowCard({ order, checked, onChange }: { order: OrderRow; checked: boolean; onChange: (checked: boolean) => void }) { return <Card withBorder radius="lg"><Group align="flex-start" wrap="nowrap"><Checkbox checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} aria-label={`בחר ${order.orderNumber}`} /><div className="grow"><Group justify="space-between"><Text fw={700}>{order.orderNumber}</Text><Badge variant="light">{statusLabels[order.status]}</Badge></Group><Text size="sm" c="dimmed">{order.location} · {order.itemSummary}</Text><Text size="sm" mt="xs">₪ {order.total}</Text></div></Group></Card>; }
