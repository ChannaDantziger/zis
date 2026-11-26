import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { request } from '../shared/api/http-client.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { OrderStatusBadge, statusLabels } from '../shared/components/OrderStatusBadge.js';
import type { BulkStatusResponse, OrderDetails, OrderStatus } from '../entities/admin.types.js';
import { useState } from 'react';
import { PackageCountDialog } from '../features/home/PackageCountDialog.js';
import { TestPaymentButton } from '../features/home/TestPaymentButton.js';
import { ManualPaymentControl } from '../features/home/ManualPaymentControl.js';
import { BundleContents } from '../features/home/BundleContents.js';
import { minimumPackageCount, packageCountError } from '../features/home/package-count.js';

const paymentLabels: Record<string, string> = { pending: 'ממתינה לתשלום', authorized: 'אושר אצל הספק', paid: 'שולמה', failed: 'תשלום נכשל' };

export function OrderDetailsPage({ selectedOrderId }: { selectedOrderId?: string } = {}) {
  const params = useParams();
  const orderId = selectedOrderId ?? params.orderId;
  const client = useQueryClient();
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const query = useQuery({ queryKey: ['order-details', orderId], gcTime: 0, queryFn: ({ signal }) => request<OrderDetails>(`/admin/orders/${encodeURIComponent(orderId ?? '')}`, { signal }) });
  const mutation = useMutation({
    mutationFn: ({ targetStatus, packageCount }: { targetStatus: OrderStatus; packageCount?: number }) => request<BulkStatusResponse>('/admin/orders/bulk-status', {
      method: 'POST', body: JSON.stringify({ targetStatus, items: [{ orderId, version: query.data?.version, ...(packageCount ? { packageCount } : {}) }] }),
    }),
    onSuccess: () => { setPackageDialogOpen(false); for (const key of ['order-details', 'orders', 'orders-status-count', 'dashboard', 'production']) client.invalidateQueries({ queryKey: [key] }); },
  });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <Stack>{!selectedOrderId && <Button component={Link} to="/orders" variant="subtle">חזרה להזמנות</Button>}<ErrorState message={query.error.message} /></Stack>;
  const order = query.data;
  const target = order.allowedNextStatuses[0];
  const address = order.deliveryAddress;
  const failure = mutation.data?.results.find((result) => !result.ok);
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between">{!selectedOrderId && <Button component={Link} to="/orders" variant="subtle">חזרה להזמנות</Button>}<OrderStatusBadge order={order} /></Group>
    <Title order={1}>הזמנה {order.orderNumber}</Title>{order.isTest && <Badge color="orange">הזמנת ניסוי · ללא חיוב אשראי</Badge>}
    <TestPaymentButton order={order} />
    <ManualPaymentControl order={order} />
    <Group><Text fw={700}>₪ {order.total}</Text><Text>אספקה: {order.deliveryDate}</Text><Text>{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</Text></Group>
    {mutation.isError && <Alert color="red" title="השינוי נכשל">{mutation.error.message}</Alert>}
    {mutation.data && <Alert color={failure ? 'orange' : 'teal'} title={failure ? 'ההזמנה לא קודמה' : 'הסטטוס עודכן'}>{failure?.reason ?? 'הרשימות מתרעננות מהשרת.'}</Alert>}
    {order.tasks.map((task) => <Alert key={task.taskId} color={task.priority === 'critical' ? 'red' : 'orange'} title={task.title}>{task.description}</Alert>)}
    <Card withBorder radius="lg"><Title order={2} mb="md">פריטים</Title><Stack>
      {order.bundles?.map(bundle => <BundleContents key={bundle.orderBundleId} bundle={bundle} />)}
      {Boolean(order.bundles?.length && order.items.length) && <Text fw={700}>מוצרים</Text>}
      {order.items.map((item) => <Group key={item.orderItemId} justify="space-between"><div><Text fw={600}>{item.productName}</Text><Text>{item.quantitySets} Sets</Text><Text c="dimmed" size="sm">₪ {item.unitSetPrice} ל־Set</Text></div><Text>₪ {item.lineTotal}</Text></Group>)}
    </Stack></Card>
    <Card withBorder radius="lg"><Title order={2} mb="md">לקוחה ומשלוח</Title><Stack gap="xs"><Text>{order.customerName}</Text><Text>טלפון המזמין: <span dir="ltr">{order.customerPhone}</span></Text><Text>טלפון זמין לקבלת המשלוח: <span dir="ltr">{order.deliveryPhone || order.customerPhone}</span></Text><Text dir="ltr" ta="right">{order.customerEmail}</Text><Text>{[address.city, address.neighborhood, address.street, address.houseNumber].filter(Boolean).join(', ')}</Text>{address.apartment && <Text>דירה: {address.apartment}</Text>}{address.postalCode && <Text>מיקוד: {address.postalCode}</Text>}{order.venueName && <Text>אולם: {order.venueName}</Text>}</Stack></Card>
    {(order.dedicationText || order.customerNotes) && <Card withBorder radius="lg"><Title order={2} mb="md">הקדשה והערות</Title>{order.dedicationText && <Text style={{ whiteSpace: 'pre-wrap' }}>{order.dedicationText}</Text>}{order.customerNotes && <Text mt="sm" style={{ whiteSpace: 'pre-wrap' }}>{order.customerNotes}</Text>}</Card>}
    <Card withBorder radius="lg"><Title order={2} mb="md">היסטוריית סטטוסים</Title><Stack>{order.history.map((entry) => <div key={entry.historyId}><Text>{entry.fromStatus ? `${statusLabels[entry.fromStatus]} ← ` : ''}{statusLabels[entry.toStatus]}</Text><Text size="sm" c="dimmed">{new Date(entry.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</Text>{entry.note && <Text size="sm">{entry.note}</Text>}</div>)}{!order.history.length && <Text c="dimmed">אין שינויי סטטוס מתועדים</Text>}</Stack></Card>
    <Group>{target && <Button loading={mutation.isPending} onClick={() => { if (target === 'in_transit') setPackageDialogOpen(true); else if (window.confirm(`לאשר העברת הזמנה ${order.orderNumber} לסטטוס "${statusLabels[target]}"?`)) mutation.mutate({ targetStatus: target }); }}>העבר ל{statusLabels[target]}</Button>}<Button component={Link} to="/production" variant="light">רשימת ייצור היום</Button></Group>
    {packageDialogOpen && target === 'in_transit' && <PackageCountDialog initialCount={order.packageCount} minimumCount={minimumPackageCount(order)} targetLabel={`העבר ל${statusLabels[target]}`} pending={mutation.isPending} error={mutation.isError ? mutation.error.message : packageCountError(failure?.reason)} onClose={() => setPackageDialogOpen(false)} onConfirm={(packageCount) => mutation.mutate({ targetStatus: target, packageCount })} />}
  </Stack>;
}
