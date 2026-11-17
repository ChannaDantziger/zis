import { useEffect, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Alert, Badge, Button, Card, Checkbox, Group, Modal, NumberInput, Pagination, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import type { BulkStatusResponse, OrderPageResponse, OrderRow, OrderStatus } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { OrderStatusBadge, statusColors, statusIcons, statusLabels } from '../shared/components/OrderStatusBadge.js';
import { observer } from 'mobx-react-lite';
import { adminUiStore } from '../stores/admin-ui.store.js';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const FILTER_DEBOUNCE_MS = 300;
const sortOptions = [
  { value: 'status', label: 'שלב תפעולי' }, { value: 'product', label: 'מוצר' },
  { value: 'location', label: 'עיר' }, { value: 'orderNumber', label: 'מספר הזמנה' }, { value: 'total', label: 'סכום' },
];
const ORDER_STATUSES: OrderStatus[] = ['ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved', 'cancelled'];

export const OrdersPage = observer(function OrdersPage() {
  const client = useQueryClient();
  const [location] = useDebouncedValue(adminUiStore.location.trim(), FILTER_DEBOUNCE_MS);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [packageCounts, setPackageCounts] = useState<Record<string, number | string>>({});
  const { deliveryDate: date, statusFilter, sortBy, sortDirection, productVariantFilter, orderPage: page } = adminUiStore;
  const params = new URLSearchParams({ deliveryDate: date, sortBy, sortDirection, page: String(page) });
  if (statusFilter) params.set('status', statusFilter);
  if (location) params.set('location', location);
  if (productVariantFilter) params.set('productVariantId', productVariantFilter);
  const locationPending = location !== adminUiStore.location.trim();
  const query = useQuery({ queryKey: ['orders', date, statusFilter, location, sortBy, sortDirection, productVariantFilter, page], queryFn: ({ signal }) => request<OrderPageResponse>(`/admin/orders/page?${params}`, { signal }), gcTime: 0 });
  const statusCountQueries = useQueries({ queries: ORDER_STATUSES.map((status) => {
    const countParams = new URLSearchParams({ deliveryDate: date, status, page: '1', pageSize: '1' });
    if (location) countParams.set('location', location);
    if (productVariantFilter) countParams.set('productVariantId', productVariantFilter);
    return { queryKey: ['orders-status-count', date, status, location, productVariantFilter], queryFn: () => request<OrderPageResponse>(`/admin/orders/page?${countParams}`), enabled: !locationPending };
  }) });
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((status, index) => [status, statusCountQueries[index]?.data?.page.totalItems ?? null])) as Record<OrderStatus, number | null>;
  const allCount = ORDER_STATUSES.every((status) => statusCounts[status] !== null) ? ORDER_STATUSES.reduce((total, status) => total + (statusCounts[status] ?? 0), 0) : null;
  const orders = query.data?.data ?? [];
  const totalPages = query.data?.page.totalPages;
  useEffect(() => { if (totalPages !== undefined && page > Math.max(1, totalPages)) adminUiStore.setOrderPage(Math.max(1, totalPages)); }, [page, totalPages]);
  useEffect(() => { adminUiStore.clearSelection(); }, [location]);
  const selected = (locationPending ? [] : orders).filter((order) => adminUiStore.selectedOrderIds.includes(order.orderId));
  const eligible = orders.filter((order) => order.allowedNextStatuses.length > 0);
  const target = selected[0]?.allowedNextStatuses.find((status) => selected.every((order) => order.allowedNextStatuses.includes(status)));
  const mutation = useMutation({
    mutationFn: ({ targetStatus, counts }: { targetStatus: OrderStatus; counts?: Record<string, number> }) => request<BulkStatusResponse>('/admin/orders/bulk-status', {
      method: 'POST', body: JSON.stringify({ targetStatus, items: selected.map(({ orderId, version }) => ({ orderId, version, ...(counts ? { packageCount: counts[orderId] } : {}) })) }),
    }),
    onSuccess: (result) => {
      adminUiStore.selectOrders(result.results.filter((item) => !item.ok).map((item) => item.orderId));
      setPackageDialogOpen(false);
      for (const key of ['orders', 'orders-status-count', 'dashboard', 'production']) client.invalidateQueries({ queryKey: [key] });
    },
  });
  const busy = mutation.isPending;
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between"><div><Text c="dimmed" size="sm">{date}</Text><Title order={1}>הזמנות לפי יום</Title></div><Button variant="subtle" disabled={busy} leftSection={<IconRefresh size={16} />} onClick={() => query.refetch()}>רענון</Button></Group>
    <TextInput type="date" maw={360} label="תאריך אספקה" value={date} disabled={busy} onChange={(event) => { if (event.currentTarget.value) adminUiStore.setDeliveryDate(event.currentTarget.value); }} />
    <Group gap="xs" className="orders-status-filters" role="group" aria-label="סינון לפי שלב ההזמנה">
      <StatusFilterButton label="הכול" count={allCount} active={!statusFilter} disabled={busy} onClick={() => adminUiStore.setStatusFilter(null)} />
      {ORDER_STATUSES.map((status) => {
        const Icon = statusIcons[status];
        return <StatusFilterButton key={status} label={statusLabels[status]} count={statusCounts[status]} icon={<Icon size={16} />} color={statusColors[status]} active={statusFilter === status} disabled={busy} onClick={() => adminUiStore.setStatusFilter(status)} />;
      })}
    </Group>
    <Group>
      <Button variant="subtle" disabled={busy} onClick={() => adminUiStore.setDeliveryDate(currentBusinessDate())}>היום</Button>
      {adminUiStore.location && <Button size="compact-sm" variant="light" disabled={busy} onClick={() => adminUiStore.setLocation('')}>עיר: {adminUiStore.location} ×</Button>}
      {productVariantFilter && <Button size="compact-sm" variant="light" disabled={busy} onClick={() => adminUiStore.setProductVariantFilter(null)}>{query.data?.variants.find((variant) => variant.value === productVariantFilter)?.label ?? 'מוצר שנבחר'} ×</Button>}
      {(sortBy !== 'status' || sortDirection !== 'asc') && <Badge>מיון: {sortOptions.find((option) => option.value === sortBy)?.label} · {sortDirection === 'asc' ? 'עולה' : 'יורד'}</Badge>}
    </Group>
    <Accordion variant="contained"><Accordion.Item value="filters"><Accordion.Control>סינון ומיון נוספים</Accordion.Control><Accordion.Panel>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput label="סינון עיר" value={adminUiStore.location} disabled={busy} onChange={(event) => adminUiStore.setLocation(event.currentTarget.value)} />
      <Select label="סינון מוצר / וריאציה" searchable clearable value={productVariantFilter} disabled={busy || query.isPending} data={query.data?.variants ?? []} onChange={(value) => adminUiStore.setProductVariantFilter(value)} />
      <Select label="מיון לפי" value={sortBy} disabled={busy} data={sortOptions} onChange={(value) => { if (value) adminUiStore.setSortBy(value); }} />
      <Select label="כיוון מיון" value={sortDirection} disabled={busy} data={[{ value: 'asc', label: 'עולה' }, { value: 'desc', label: 'יורד' }]} onChange={(value) => { if (value) adminUiStore.setSortDirection(value); }} />
    </SimpleGrid>
    <Button variant="subtle" mt="sm" disabled={busy} onClick={() => adminUiStore.clearAdditionalFilters()}>ניקוי הסינון והמיון הנוספים</Button>
    </Accordion.Panel></Accordion.Item></Accordion>
    <Card withBorder radius="lg" className="orders-sticky-toolbar">
      {query.data && <Group justify="space-between" wrap="wrap">
        <Checkbox label={`בחירת ההזמנות שניתן לקדם בעמוד הנוכחי · ${eligible.length}`} disabled={busy || locationPending || !eligible.length} checked={eligible.length > 0 && eligible.every((order) => adminUiStore.selectedOrderIds.includes(order.orderId))} indeterminate={selected.length > 0 && selected.length < eligible.length} onChange={(event) => adminUiStore.selectOrders(event.currentTarget.checked ? eligible.map((order) => order.orderId) : [])} />
        {selected.length > 0 && <Group gap="xs"><Text fw={600}>{selected.length} נבחרו</Text><Button size="sm" loading={busy} disabled={!target} rightSection={<IconArrowLeft size={16} />} onClick={() => { if (target === 'in_transit') { setPackageCounts(Object.fromEntries(selected.map((order) => [order.orderId, '']))); setPackageDialogOpen(true); } else if (target && window.confirm(`לאשר העברה של ${selected.length} הזמנות לסטטוס "${statusLabels[target]}"?`)) mutation.mutate({ targetStatus: target }); }}>{target ? statusLabels[target] : 'אין מעבר משותף'}</Button><Button size="sm" variant="subtle" disabled={busy} onClick={() => adminUiStore.clearSelection()}>נקה בחירה</Button></Group>}
      </Group>}
      {selected.length > 0 && !target && <Text size="sm" mt="xs">בחרי הזמנות שנמצאות באותו שלב ויכולות להתקדם יחד.</Text>}
      {mutation.isError && <Alert mt="sm" color="red" title="שינוי הסטטוס נכשל">{mutation.error.message}</Alert>}
      {mutation.data && <Alert mt="sm" color={mutation.data.failed ? 'orange' : 'teal'} title={`הושלמו ${mutation.data.succeeded}, נכשלו ${mutation.data.failed}`}><Stack gap="xs">{mutation.data.results.filter((item) => !item.ok).map((item) => <Text key={item.orderId} size="sm">{orders.find((order) => order.orderId === item.orderId)?.orderNumber ?? item.orderId}: {item.reason ?? 'המעבר לא הושלם'}</Text>)}</Stack></Alert>}
    </Card>
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : <>
      <Text>{query.data?.page.totalItems ?? 0} הזמנות · {orders.length} בעמוד הנוכחי</Text>
      {!orders.length ? <EmptyState>אין הזמנות לתאריך ולמסננים אלה</EmptyState> : <Stack>{orders.map((order) => <OrderRowCard key={order.orderId} order={order} busy={busy || locationPending} />)}</Stack>}
      {(query.data?.page.totalPages ?? 0) > 1 && <Pagination total={query.data!.page.totalPages} value={page} disabled={busy || locationPending} onChange={(value) => adminUiStore.setOrderPage(value)} aria-label="עמודי הזמנות" />}
    </>}
    <Modal opened={packageDialogOpen} onClose={() => setPackageDialogOpen(false)} title="מספר מארזים לפני יציאה למשלוח">
      <Stack><Text size="sm">הזיני את מספר המארזים לכל הזמנה. המספר יישמר בפרטי ההזמנה עם העברתה לסטטוס יצאה.</Text>
        {selected.map((order) => <NumberInput key={order.orderId} label={`${order.orderNumber} · ${order.location}`} value={packageCounts[order.orderId] ?? ''} min={1} max={9999} allowDecimal={false} allowNegative={false} required onChange={(value) => setPackageCounts((current) => ({ ...current, [order.orderId]: value }))} />)}
        <Button loading={busy} disabled={!selected.length || selected.some((order) => !Number.isInteger(packageCounts[order.orderId]) || Number(packageCounts[order.orderId]) < 1 || Number(packageCounts[order.orderId]) > 9999)} onClick={() => mutation.mutate({ targetStatus: 'in_transit', counts: Object.fromEntries(selected.map((order) => [order.orderId, Number(packageCounts[order.orderId])])) })}>אישור והעברה ליצאה</Button>
      </Stack>
    </Modal>
  </Stack>;
});

function StatusFilterButton({ label, count, icon, color = '#60412f', active, disabled, onClick }: { label: string; count: number | null; icon?: ReactNode; color?: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return <Button type="button" variant={active ? 'filled' : 'light'} color={color} leftSection={icon} aria-pressed={active} disabled={disabled} onClick={onClick}>{label} <b className="orders-status-count">{count ?? '…'}</b></Button>;
}

const OrderRowCard = observer(function OrderRowCard({ order, busy }: { order: OrderRow; busy: boolean }) {
  return <Card withBorder radius="lg"><Group align="flex-start" wrap="nowrap">
    {order.allowedNextStatuses.length > 0 && <Checkbox disabled={busy} checked={adminUiStore.selectedOrderIds.includes(order.orderId)} onChange={(event) => adminUiStore.toggleOrder(order.orderId, event.currentTarget.checked)} aria-label={`בחר ${order.orderNumber}`} />}
    <div className="grow"><Group justify="space-between"><Text fw={700}>{order.orderNumber}</Text><OrderStatusBadge order={order} /></Group>{order.isTest && <Badge color="orange" mt="xs">הזמנת ניסוי · ללא חיוב</Badge>}<Text size="sm" c="dimmed">{order.location}</Text><Text size="sm" truncate title={order.itemSummary}>{order.itemSummary}</Text><Group mt="xs"><Text size="sm">₪ {order.total}</Text>{order.hasOpenTask && <Badge color="orange">שים לב · משימה פתוחה</Badge>}<Button component={Link} to={`/orders/${order.orderId}`} variant="subtle" size="xs" disabled={busy}>פתח פרטים</Button></Group></div>
  </Group></Card>;
});
