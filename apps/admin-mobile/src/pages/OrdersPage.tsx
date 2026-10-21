import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Checkbox, Group, Pagination, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import type { BulkStatusResponse, OrderPageResponse, OrderRow, OrderStatus } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { OrderStatusBadge, statusLabels } from '../shared/components/OrderStatusBadge.js';
import { observer } from 'mobx-react-lite';
import { adminUiStore } from '../stores/admin-ui.store.js';
import { Link } from 'react-router-dom';

const FILTER_DEBOUNCE_MS = 300;
const sortOptions = [
  { value: 'status', label: 'שלב תפעולי' }, { value: 'product', label: 'מוצר' },
  { value: 'location', label: 'עיר' }, { value: 'orderNumber', label: 'מספר הזמנה' }, { value: 'total', label: 'סכום' },
];

export const OrdersPage = observer(function OrdersPage() {
  const client = useQueryClient();
  const [location] = useDebouncedValue(adminUiStore.location.trim(), FILTER_DEBOUNCE_MS);
  const { deliveryDate: date, statusFilter, sortBy, sortDirection, productVariantFilter, orderPage: page } = adminUiStore;
  const params = new URLSearchParams({ deliveryDate: date, sortBy, sortDirection, page: String(page) });
  if (statusFilter) params.set('status', statusFilter);
  if (location) params.set('location', location);
  if (productVariantFilter) params.set('productVariantId', productVariantFilter);
  const query = useQuery({ queryKey: ['orders', date, statusFilter, location, sortBy, sortDirection, productVariantFilter, page], queryFn: ({ signal }) => request<OrderPageResponse>(`/admin/orders/page?${params}`, { signal }), gcTime: 0 });
  const orders = query.data?.data ?? [];
  const locationPending = location !== adminUiStore.location.trim();
  const totalPages = query.data?.page.totalPages;
  useEffect(() => { if (totalPages !== undefined && page > Math.max(1, totalPages)) adminUiStore.setOrderPage(Math.max(1, totalPages)); }, [page, totalPages]);
  useEffect(() => { adminUiStore.clearSelection(); }, [location]);
  const selected = (locationPending ? [] : orders).filter((order) => adminUiStore.selectedOrderIds.includes(order.orderId));
  const eligible = orders.filter((order) => order.allowedNextStatuses.length > 0);
  const target = selected[0]?.allowedNextStatuses.find((status) => selected.every((order) => order.allowedNextStatuses.includes(status)));
  const mutation = useMutation({
    mutationFn: (targetStatus: OrderStatus) => request<BulkStatusResponse>('/admin/orders/bulk-status', {
      method: 'POST', body: JSON.stringify({ targetStatus, items: selected.map(({ orderId, version }) => ({ orderId, version })) }),
    }),
    onSuccess: (result) => {
      adminUiStore.selectOrders(result.results.filter((item) => !item.ok).map((item) => item.orderId));
      for (const key of ['orders', 'dashboard', 'production']) client.invalidateQueries({ queryKey: [key] });
    },
  });
  const busy = mutation.isPending;
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between"><div><Text c="dimmed" size="sm">{date}</Text><Title order={1}>הזמנות לפי יום</Title></div><Button variant="subtle" disabled={busy} leftSection={<IconRefresh size={16} />} onClick={() => query.refetch()}>רענון</Button></Group>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput type="date" label="תאריך אספקה" value={date} disabled={busy} onChange={(event) => { if (event.currentTarget.value) adminUiStore.setDeliveryDate(event.currentTarget.value); }} />
      <Select label="סינון סטטוס" clearable disabled={busy} value={statusFilter} onChange={(value) => adminUiStore.setStatusFilter(value)} data={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
      <TextInput label="סינון עיר" value={adminUiStore.location} disabled={busy} onChange={(event) => adminUiStore.setLocation(event.currentTarget.value)} />
      <Select label="סינון מוצר / וריאציה" searchable clearable value={productVariantFilter} disabled={busy || query.isPending} data={query.data?.variants ?? []} onChange={(value) => adminUiStore.setProductVariantFilter(value)} />
      <Select label="מיון לפי" value={sortBy} disabled={busy} data={sortOptions} onChange={(value) => { if (value) adminUiStore.setSortBy(value); }} />
      <Select label="כיוון מיון" value={sortDirection} disabled={busy} data={[{ value: 'asc', label: 'עולה' }, { value: 'desc', label: 'יורד' }]} onChange={(value) => { if (value) adminUiStore.setSortDirection(value); }} />
    </SimpleGrid>
    <Button variant="subtle" disabled={busy} onClick={() => adminUiStore.setDeliveryDate(currentBusinessDate())}>חזרה להיום</Button>
    {mutation.isError && <Alert color="red" title="שינוי הסטטוס נכשל">{mutation.error.message}</Alert>}
    {mutation.data && <Alert color={mutation.data.failed ? 'orange' : 'teal'} title={`הושלמו ${mutation.data.succeeded}, נכשלו ${mutation.data.failed}`}><Stack gap="xs">{mutation.data.results.filter((item) => !item.ok).map((item) => <Text key={item.orderId} size="sm">{orders.find((order) => order.orderId === item.orderId)?.orderNumber ?? item.orderId}: {item.reason ?? 'המעבר לא הושלם'}</Text>)}</Stack></Alert>}
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : <>
      <Group justify="space-between"><Text>{query.data?.page.totalItems ?? 0} הזמנות · {orders.length} בעמוד הנוכחי</Text><Checkbox label="בחירת ההזמנות שניתן לקדם בעמוד הנוכחי" disabled={busy || locationPending || !eligible.length} checked={eligible.length > 0 && eligible.every((order) => adminUiStore.selectedOrderIds.includes(order.orderId))} indeterminate={selected.length > 0 && selected.length < eligible.length} onChange={(event) => adminUiStore.selectOrders(event.currentTarget.checked ? eligible.map((order) => order.orderId) : [])} /></Group>
      {selected.length > 0 && <Card withBorder radius="lg" className="action-bar"><Group justify="space-between"><Text fw={600}>{selected.length} נבחרו</Text><Button loading={busy} disabled={!target} rightSection={<IconArrowLeft size={16} />} onClick={() => { if (target) mutation.mutate(target); }}>{target ? statusLabels[target] : 'אין מעבר משותף'}</Button><Button variant="subtle" disabled={busy} onClick={() => adminUiStore.clearSelection()}>נקה בחירה</Button></Group>{!target && <Text size="sm" mt="xs">בחרי הזמנות שנמצאות באותו שלב ויכולות להתקדם יחד.</Text>}</Card>}
      {!orders.length ? <EmptyState>אין הזמנות לתאריך ולמסננים אלה</EmptyState> : <Stack>{orders.map((order) => <OrderRowCard key={order.orderId} order={order} busy={busy || locationPending} />)}</Stack>}
      {(query.data?.page.totalPages ?? 0) > 1 && <Pagination total={query.data!.page.totalPages} value={page} disabled={busy || locationPending} onChange={(value) => adminUiStore.setOrderPage(value)} aria-label="עמודי הזמנות" />}
    </>}
  </Stack>;
});

const OrderRowCard = observer(function OrderRowCard({ order, busy }: { order: OrderRow; busy: boolean }) {
  return <Card withBorder radius="lg"><Group align="flex-start" wrap="nowrap">
    <Checkbox disabled={busy || !order.allowedNextStatuses.length} checked={adminUiStore.selectedOrderIds.includes(order.orderId)} onChange={(event) => adminUiStore.toggleOrder(order.orderId, event.currentTarget.checked)} aria-label={`בחר ${order.orderNumber}`} />
    <div className="grow"><Group justify="space-between"><Text fw={700}>{order.orderNumber}</Text><OrderStatusBadge order={order} /></Group><Text size="sm" c="dimmed">{order.location}</Text><Text size="sm" truncate title={order.itemSummary}>{order.itemSummary}</Text><Group mt="xs"><Text size="sm">₪ {order.total}</Text>{order.hasOpenTask && <Badge color="orange">שים לב · משימה פתוחה</Badge>}<Button component={Link} to={`/orders/${order.orderId}`} variant="subtle" size="xs" disabled={busy}>פתח פרטים</Button></Group></div>
  </Group></Card>;
});
