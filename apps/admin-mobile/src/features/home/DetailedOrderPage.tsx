import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Alert, Badge, Button, Card, Group, Modal, Radio, SimpleGrid, Stack, Text, Textarea, Title } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { request } from '../../shared/api/http-client.js';
import { ErrorState, LoadingState } from '../../shared/components/StateMessage.js';
import { OrderStatusBadge, statusColors, statusIcons, statusLabels } from '../../shared/components/OrderStatusBadge.js';
import type { BulkStatusResponse, OrderDetails, OrderStatus } from '../../entities/admin.types.js';
import type { HomeItem } from './home.types.js';
import { PackageCountDialog } from './PackageCountDialog.js';
import { TestPaymentButton } from './TestPaymentButton.js';
import { ManualPaymentControl } from './ManualPaymentControl.js';
import { BundleContents } from './BundleContents.js';
import { minimumPackageCount, needsPackageResetChoice, packageCountError } from './package-count.js';

const STATUSES: OrderStatus[] = ['ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved'];
const paymentLabels: Record<string, string> = { pending: 'ממתינה לתשלום', authorized: 'אושר אצל הספק', paid: 'שולמה', failed: 'תשלום נכשל' };
const missing = 'לא צוין';

export function DetailedOrderPage({ selectedOrderId, itemImages = [] }: { selectedOrderId?: string; itemImages?: HomeItem[] } = {}) {
  const params = useParams(), client = useQueryClient();
  const orderId = selectedOrderId ?? params.orderId;
  const [correctionTarget, setCorrectionTarget] = useState<OrderStatus | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [resetPackages, setResetPackages] = useState<boolean | null>(null);
  const [packageTarget, setPackageTarget] = useState<OrderStatus | null>(null);
  const query = useQuery({ queryKey: ['order-details', orderId], gcTime: 0,
    queryFn: ({ signal }) => request<OrderDetails>(`/admin/orders/${encodeURIComponent(orderId ?? '')}`, { signal }) });
  const refresh = () => Promise.all(['order-details', 'orders', 'dashboard', 'home-orders', 'production'].map(key => client.invalidateQueries({ queryKey: [key] })));
  const advance = useMutation({ mutationFn: ({ target, packageCount }: { target: OrderStatus; packageCount?: number }) => request<BulkStatusResponse>('/admin/orders/bulk-status', {
    method: 'POST', body: JSON.stringify({ targetStatus: target, items: [{ orderId, version: query.data?.version, ...(packageCount ? { packageCount } : {}) }] }),
  }), onSuccess: async data => { if (data.results.every(result => result.ok)) setPackageTarget(null); await refresh(); } });
  const correction = useMutation({ mutationFn: (target: OrderStatus) => request(`/admin/orders/${encodeURIComponent(orderId ?? '')}/correct-status`, {
    method: 'POST', body: JSON.stringify({ targetStatus: target, version: query.data?.version, note: correctionNote.trim() || null, ...(resetPackages === null ? {} : { resetPackageCount: resetPackages }) }),
  }), onSuccess: async () => { setCorrectionTarget(null); setCorrectionNote(''); await refresh(); } });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  const order = query.data, address = order.deliveryAddress;
  const target = order.allowedNextStatuses[0];
  const advanceFailure = advance.data?.results.find(result => !result.ok);
  return <Stack gap="lg" maw={950} mx="auto">
    {!selectedOrderId && <Button component={Link} to="/orders" variant="subtle" w="fit-content">חזרה להזמנות</Button>}
    <Group justify="space-between"><Title order={1}>פרטים · {order.orderNumber}</Title><OrderStatusBadge order={order} /></Group>
    {order.isTest && <Badge color="orange">הזמנת ניסוי · ללא חיוב אשראי</Badge>}
    <TestPaymentButton order={order} />
    <ManualPaymentControl order={order} />
    <Card withBorder radius="lg"><Title order={2} mb="sm">מידע חשוב לשלב הזה</Title>{stageSummary(order)}</Card>
    {advance.isError && <Alert color="red">{advance.error.message}</Alert>}
    {advanceFailure && <Alert color="red">המעבר לא בוצע: {advanceFailure.reason ?? 'רענני ונסי שוב'}</Alert>}
    {advance.isSuccess && !advanceFailure && <Alert color="teal">הסטטוס עודכן. הפרטים מתרעננים.</Alert>}
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <DetailsCard title="הזמנה ותשלום"><Field label="מספר הזמנה" value={order.orderNumber} /><Field label="נוצרה" value={formatDateTime(order.createdAt)} /><Field label="עודכנה" value={formatDateTime(order.updatedAt)} /><Field label="סטטוס" value={statusLabels[order.status]} /><Field label="מצב תשלום" value={paymentLabels[order.paymentStatus] ?? order.paymentStatus} /><Field label="אושר תשלום" value={formatDateTime(order.paymentConfirmedAt ?? undefined)} /><Field label="תאריך אספקה" value={order.deliveryDate} /><Field label="הזמנה דחופה" value={order.isUrgent ? 'כן' : 'לא'} /></DetailsCard>
      <DetailsCard title="לקוחה ויצירת קשר"><Field label="שם" value={order.customerName} /><Field label="טלפון המזמינה" value={order.customerPhone} /><Field label="דוא״ל" value={order.customerEmail} /></DetailsCard>
      <DetailsCard title="נתונים לשליח"><Field label="שיטת אספקה" value={order.shippingMethod} /><Field label="אזור משלוח" value={order.shippingZoneName} /><Field label="עיר" value={address.city} /><Field label="שכונה" value={address.neighborhood} /><Field label="רחוב" value={address.street} /><Field label="מספר בית" value={address.houseNumber} /><Field label="דירה" value={address.apartment} /><Field label="מיקוד" value={address.postalCode} /><Field label="אולם / מקום מסירה" value={order.venueName} /><Field label="טלפון זמין לשליח" value={order.deliveryPhone || order.customerPhone} /><Field label="חלון מסירה" value={displayWindow(order.deliveryTimeWindow)} /><Field label="מספר מארזים" value={order.packageCount ?? 'טרם הוזן באריזה'} /><Field label="הוראות לשליח" value={order.courierNotes} /></DetailsCard>
      <DetailsCard title="סכומים"><Field label="מוצרים" value={money(order.subtotal)} /><Field label="דמי משלוח" value={money(order.shippingTotal)} /><Field label="סה״כ לתשלום" value={money(order.total)} /><Field label="מצב תשלום" value={paymentLabels[order.paymentStatus] ?? order.paymentStatus} /></DetailsCard>
    </SimpleGrid>
    <Card withBorder radius="lg"><Title order={2} mb="sm">רישומי תשלום</Title><Stack gap="sm">
      {(order.payments ?? []).map((payment, index) => <div key={`${payment.provider}-${payment.createdAt}-${index}`}>
        <Text fw={700}>{payment.isSimulated ? 'אישור ניסיון ללא חיוב' : payment.provider === 'manual_external' ? `תשלום חיצוני: ${payment.manualMethod || 'לא צוינה דרך'}` : payment.provider} · ₪{payment.amount} {payment.currency}</Text>
        <Text size="sm">מצב: {paymentLabels[payment.status] ?? payment.status} · {formatDateTime(payment.createdAt)}</Text>
        {payment.providerTransactionId && <Text size="sm">אסמכתא: {payment.providerTransactionId}</Text>}
      </div>)}{!order.payments?.length && <Text c="dimmed">אין רישום תשלום נוסף בהזמנה.</Text>}
    </Stack></Card>
    <Card withBorder radius="lg"><Title order={2} mb="sm">מוצרים ותכולה</Title><Stack>{order.bundles?.map(bundle => <BundleContents key={bundle.orderBundleId} bundle={bundle} />)}
    {Boolean(order.bundles?.length && order.items.length) && <Text fw={700}>מוצרים</Text>}{order.items.map(item => {
      const image = item.imageUrl ?? itemImages.find(source => source.orderItemId === item.orderItemId)?.imageUrl;
      return <Group key={item.orderItemId} wrap="nowrap" align="center" justify="space-between" className="home-detail-item">
        <Group wrap="nowrap">{image ? <img className="home-thumb" src={image} alt={item.productName} /> : <div className="home-thumb home-thumb-empty" role="img" aria-label={`אין תמונה ל${item.productName}`}>אין תמונה</div>}<div><Text fw={700}>{item.productName}</Text><Text size="sm">{item.quantitySets} סטים</Text><Text size="xs" c="dimmed">קוד: {item.productCode || missing} · {item.setSize ?? missing} יחידות בסט</Text></div></Group>
        <div><Text size="sm">₪{item.unitSetPrice} לסט</Text><Text fw={700}>₪{item.lineTotal}</Text></div>
      </Group>;
    })}</Stack></Card>
    <SimpleGrid cols={{ base: 1, md: 2 }}><DetailsCard title="הקדשה והערות"><Field label="הקדשה" value={order.dedicationText} /><Field label="הערות הלקוחה" value={order.customerNotes} /><Field label="הערות פנימיות" value={order.internalNotes} /></DetailsCard>
      <DetailsCard title="משימות קשורות">{order.tasks.length ? order.tasks.map(task => <Text key={task.taskId}>{task.title} · {task.description || missing}</Text>) : <Text c="dimmed">אין משימות פעילות להזמנה.</Text>}</DetailsCard></SimpleGrid>
    <Card withBorder radius="lg"><Title order={2} mb="sm">היסטוריית סטטוסים</Title><Stack gap="xs">{order.history.map(entry => <div key={entry.historyId}><Text fw={600}>{entry.fromStatus ? `${statusLabels[entry.fromStatus]} ← ` : ''}{statusLabels[entry.toStatus]}</Text><Text size="xs" c="dimmed">{formatDateTime(entry.createdAt)}</Text>{entry.note && <Text size="sm">{entry.note}</Text>}</div>)}{!order.history.length && <Text c="dimmed">אין שינויים מתועדים</Text>}</Stack></Card>
    {target && <Button loading={advance.isPending} onClick={() => ['packed', 'in_transit'].includes(target) ? (setPackageTarget(target), advance.reset()) : advance.mutate({ target })} color={statusColors[target]}>{actionLabel(target)}</Button>}
    {packageTarget && <PackageCountDialog key={`${orderId}-${packageTarget}`} initialCount={order.packageCount} minimumCount={minimumPackageCount(order)}
      targetLabel={actionLabel(packageTarget)} pending={advance.isPending}
      error={advance.isError ? advance.error.message : packageCountError(advance.data?.results.find(result => !result.ok)?.reason)}
      onClose={() => setPackageTarget(null)} onConfirm={packageCount => advance.mutate({ target: packageTarget, packageCount })} />}
    {!target && order.status === 'ordered' && order.paymentStatus !== 'paid' && <Text c="dimmed">אפשר להתחיל הכנה לאחר אישור תשלום.</Text>}
    {order.status !== 'cancelled' && <Accordion variant="contained"><Accordion.Item value="correction"><Accordion.Control>פרטים נוספים · תיקון סטטוס שנבחר בטעות</Accordion.Control><Accordion.Panel>
      <Text size="sm" c="dimmed" mb="sm">מיועד לתיקון טעות בלבד. ביטול הזמנה הוא תהליך נפרד.</Text><Group>{STATUSES.map(status => {
        const Icon = statusIcons[status]; return <Button key={status} variant="light" color={statusColors[status]}
          leftSection={<Icon size={16} />} disabled={status === order.status} onClick={() => { setCorrectionTarget(status); setResetPackages(null); correction.reset(); }}>
          {statusLabels[status]}</Button>;
      })}</Group>
    </Accordion.Panel></Accordion.Item></Accordion>}
    <Modal opened={Boolean(correctionTarget)} onClose={() => setCorrectionTarget(null)} title="אישור תיקון סטטוס">
      <Stack><Text>האם לאשר העברת ההזמנה ל־<b>{correctionTarget ? statusLabels[correctionTarget] : ''}</b>?</Text>
        {correctionTarget && needsPackageResetChoice(order.status, correctionTarget) && <Radio.Group label="האם לאפס את מספר האריזות?" description="באיפוס תידרש קביעה מחדש לפי המינימום הנדרש לתכולת ההזמנה." value={resetPackages === null ? '' : String(resetPackages)} onChange={value => setResetPackages(value === 'true')} required>
          <Stack gap="xs" mt="xs"><Radio value="true" label="לאפס ולקבוע מחדש" /><Radio value="false" label="לשמור את מספר האריזות הקיים" /></Stack>
        </Radio.Group>}
        <Textarea label="סיבת התיקון (אפשר להשאיר ריק)" value={correctionNote} maxLength={5000} onChange={event => setCorrectionNote(event.currentTarget.value)} />
        {correction.isError && <Alert color="red">{correction.error.message}</Alert>}
        <Group justify="end"><Button variant="subtle" onClick={() => setCorrectionTarget(null)}>חזרה</Button><Button disabled={Boolean(correctionTarget && needsPackageResetChoice(order.status, correctionTarget) && resetPackages === null)} color={correctionTarget ? statusColors[correctionTarget] : undefined} loading={correction.isPending} onClick={() => { if (correctionTarget) correction.mutate(correctionTarget); }}>כן, לתקן סטטוס</Button></Group>
      </Stack>
    </Modal>
  </Stack>;
}

function DetailsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card withBorder radius="lg"><Title order={2} mb="sm">{title}</Title><Stack gap="xs">{children}</Stack></Card>;
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <Group gap="xs" align="start"><Text size="sm" fw={700}>{label}:</Text><Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{value === null || value === undefined || value === '' ? missing : value}</Text></Group>;
}
function money(value: string | undefined) { return value === undefined ? missing : `₪${value}`; }
function formatDateTime(value: string | undefined) { return value ? new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) : missing; }
function displayWindow(value: unknown) { return value === null || value === undefined ? missing : typeof value === 'string' ? value : JSON.stringify(value); }
function actionLabel(target: OrderStatus) { return ({ in_preparation: 'התחלת הכנה', packed: 'סיום אריזה', in_transit: 'יציאה למשלוח', delivered: 'סימון כנמסרה', approved: 'סגירת הזמנה' } as Partial<Record<OrderStatus, string>>)[target] ?? `העברה ל${statusLabels[target]}`; }
function stageSummary(order: OrderDetails) {
  if (order.status === 'ordered') return <Text>תשלום: {paymentLabels[order.paymentStatus] ?? order.paymentStatus} · סה״כ ₪{order.total}</Text>;
  if (order.status === 'in_preparation') return <Text>{order.items.map(item => `${item.productName} · ${item.quantitySets} סטים`).join(', ')}</Text>;
  if (order.status === 'packed') return <Text>נארזו {order.packageCount ?? 'טרם הוזן מספר'} מארזים · יעד: {order.deliveryAddress.city}</Text>;
  if (order.status === 'in_transit') return <Text>אזור {order.shippingZoneName || missing} · {order.deliveryAddress.city}, {order.deliveryAddress.street} {order.deliveryAddress.houseNumber} · טלפון {order.deliveryPhone || order.customerPhone} · {order.packageCount ?? missing} מארזים</Text>;
  return <Text>יעד: {order.deliveryAddress.city} · סטטוס: {statusLabels[order.status]}</Text>;
}
