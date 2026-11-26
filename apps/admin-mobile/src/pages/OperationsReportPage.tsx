import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Accordion, Alert, Badge, Button, Checkbox, Group, Image, NumberInput, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconArrowRight, IconPrinter, IconRefresh } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { OperationReport, OperationReportKind, OperationReportOrder } from '../entities/operations-reports.types.js';
import { BundleCount } from '../features/home/BundleCount.js';
import { MAX_PACKAGE_COUNT, minimumPackageCount, packageCountError, packageCountFor, validPackageCount } from '../features/home/package-count.js';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { statusLabels } from '../shared/components/OrderStatusBadge.js';
import type { BulkStatusResponse } from '../entities/admin.types.js';
import './operations-report.css';

const MAX_SELECTION = 100;
const LOGO_PATH = '/zis-logo-dark.png';
const BUSINESS_TIMEZONE = 'Asia/Jerusalem';

export function PackingReportPage() { return <OperationsReportPage kind="packing" />; }
export function DeliveryReportPage() { return <OperationsReportPage kind="delivery" />; }

const OperationsReportPage = observer(function OperationsReportPage({ kind }: { kind: OperationReportKind }) {
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const date = params.get('date') ?? currentBusinessDate();
  const city = params.get('city') ?? '';
  const selectedIds = params.get('orderIds') ?? '';
  const ui = useLocalObservable(() => ({
    city: '', selected: new Set<string>(), counts: {} as Record<string, number | string>,
    toggle(id: string, checked: boolean) { if (checked) this.selected.add(id); else this.selected.delete(id); },
    clear() { this.selected.clear(); },
    setCity(value: string) { this.city = value; },
    setCount(id: string, value: number | string) { this.counts[id] = value; },
  }));
  const reportParams = new URLSearchParams({ date });
  if (city) reportParams.set('city', city);
  if (selectedIds) reportParams.set('orderIds', selectedIds);
  const query = useQuery({
    queryKey: ['operations-report', kind, date, city, selectedIds],
    queryFn: ({ signal }) => request<OperationReport>(`/admin/reports/${kind}?${reportParams}`, { signal }),
    staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false,
  });
  useEffect(() => { ui.clear(); }, [query.dataUpdatedAt, ui]);
  useEffect(() => { ui.setCity(city); }, [city, ui]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `ZIS-${kind}-${date}`;
    return () => { document.title = previousTitle; };
  }, [kind, date]);
  const title = kind === 'packing' ? 'תוויות אריזה' : 'רשימת אספקה';
  const dateLabel = kind === 'packing' ? 'תאריך אספקה' : 'תאריך יציאה בפועל · שעון ישראל';
  const report = query.data;
  const countFor = (order: OperationReportOrder) => packageCountFor(order, ui.counts[order.orderId]);
  const validCount = (order: OperationReportOrder) => validPackageCount(order, countFor(order));
  const advanceMutation = useMutation({
    mutationFn: async (orders: OperationReportOrder[]) => {
      const outcomes = [];
      for (const order of orders.filter((candidate) => candidate.status === 'packed')) {
        if (!validCount(order)) throw new Error(`יש להזין מספר אריזות תקין להזמנה ${order.orderNumber}.`);
        const packageCount = Number(countFor(order));
        outcomes.push(await request<BulkStatusResponse>('/admin/orders/bulk-status', { method: 'POST', body: JSON.stringify({ targetStatus: 'in_transit', items: [{ orderId: order.orderId, version: order.version, packageCount }] }) }));
      }
      return outcomes;
    },
    onSuccess: async () => { await Promise.all(['operations-report', 'orders', 'dashboard', 'production', 'home-orders'].map((key) => client.invalidateQueries({ queryKey: [key] }))); },
  });
  const printAndAdvance = () => {
    window.print();
    const eligibleOrders = (report?.orders ?? []).filter((order) => order.status === 'packed');
    if (kind === 'packing' && eligibleOrders.length && window.confirm(`ההדפסה הסתיימה. להעביר ${eligibleOrders.length} הזמנות לסטטוס "יצאה"?`)) void advanceMutation.mutateAsync(eligibleOrders);
  };
  const updateFilters = (nextDate: string, nextCity: string, ids?: string) => {
    const next = new URLSearchParams({ date: nextDate });
    if (nextCity.trim()) next.set('city', nextCity.trim());
    if (ids) next.set('orderIds', ids);
    setParams(next);
  };
  return <Stack className={`operations-report-page ${kind}-report`} gap="lg" maw={1000} mx="auto">
    <Group className="operations-report-controls" justify="space-between">
      <Button component={Link} to="/orders" variant="subtle" leftSection={<IconArrowRight size={16} />}>חזרה להזמנות</Button>
      <Group>
        <Button variant="default" loading={query.isFetching} leftSection={<IconRefresh size={16} />} onClick={() => query.refetch()}>רענון</Button>
        {ui.selected.size > 0 && <Button disabled={ui.selected.size > MAX_SELECTION || query.isFetching} onClick={() => updateFilters(date, city, [...ui.selected].join(','))}>הכנת {ui.selected.size} הזמנות להדפסה</Button>}
        <Button disabled={!query.isSuccess || query.isFetching || ui.selected.size > 0 || advanceMutation.isPending || (kind === 'packing' && (report?.orders ?? []).some(order => !validCount(order)))} loading={advanceMutation.isPending} leftSection={<IconPrinter size={16} />} onClick={printAndAdvance}>הדפסה / שמירה כ־PDF</Button>
      </Group>
    </Group>
    <Group className="operations-report-controls" align="end">
      <TextInput type="date" label={dateLabel} value={date} onChange={(event) => updateFilters(event.currentTarget.value, city)} />
      {(city || selectedIds) && <Button variant="light" onClick={() => updateFilters(date, '')}>ניקוי הסינון והצגת כל ההזמנות</Button>}
      {city && <Badge>עיר: {city}</Badge>}{selectedIds && <Badge>מוצגות ההזמנות שנבחרו בלבד</Badge>}
    </Group>
    <Accordion className="operations-report-controls" variant="contained"><Accordion.Item value="filters"><Accordion.Control>סינון והדפסה של חלק מההזמנות</Accordion.Control><Accordion.Panel>
    <Group align="end">
      <TextInput label="סינון לפי עיר" value={ui.city} maxLength={120} onChange={(event) => ui.setCity(event.currentTarget.value)} />
      <Button variant="default" onClick={() => updateFilters(date, ui.city)}>סינון</Button>
      {selectedIds && <Button variant="subtle" onClick={() => updateFilters(date, city)}>כל ההזמנות המתאימות</Button>}
    </Group>
    </Accordion.Panel></Accordion.Item></Accordion>
    <Text className="operations-report-controls" size="sm" c="dimmed">להדפסה חלקית, סמני עד {MAX_SELECTION} הזמנות ולחצי למעלה על הכנת ההזמנות להדפסה.</Text>
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : report && <>
      <div className="operations-report-heading"><Title order={1}>{title}</Title><Text>{dateLabel}: {report.date}</Text>
        <Text size="sm">נשלף: {formatTime(report.generatedAt)} · {report.orders.length} הזמנות</Text>
        <Text size="sm">{kind === 'packing' ? 'הזמנות ששולמו ועברו אריזה. לאחר ההדפסה ניתן לאשר מעבר ליצאה.' : 'לפי היסטוריית יציאה למשלוח ביום הנבחר; מוצג גם המצב הנוכחי של כל הזמנה.'}</Text>
      </div>
      {advanceMutation.isError && <Alert color="red" title="העברת ההזמנה נכשלה">{advanceMutation.error.message}</Alert>}
      {advanceMutation.data && <Alert color={advanceMutation.data.some((result) => result.failed > 0) ? 'orange' : 'teal'} title={`העברה הושלמה · ${advanceMutation.data.reduce((sum, result) => sum + result.succeeded, 0)} הצליחו, ${advanceMutation.data.reduce((sum, result) => sum + result.failed, 0)} נכשלו`}>
        {advanceMutation.data.flatMap(result => result.results.filter(item => !item.ok)).map(item => <Text key={item.orderId} size="sm">{report.orders.find(order => order.orderId === item.orderId)?.orderNumber ?? item.orderId}: {packageCountError(item.reason) ?? 'המעבר לא הושלם'}</Text>)}
      </Alert>}
      {!report.orders.length && <Paper withBorder p="lg"><Text>אין הזמנות מתאימות לדוח זה.</Text></Paper>}
      {report.orders.map((order, index) => <div key={order.orderId}>
        {kind === 'delivery' && (index === 0 || report.orders[index - 1].address.city !== order.address.city) && <>
          <Title order={2} className={`delivery-city-heading${index === 0 ? ' delivery-city-first' : ''}`}>{order.address.city || 'עיר לא צוינה'}</Title>
          <Text className="delivery-city-summary" fw={600}>{cityPackageSummary(report.orders, order.address.city)}</Text>
        </>}
        {Array.from({ length: kind === 'packing' && validCount(order) ? Number(countFor(order)) : 1 }, (_, packageIndex) => {
          const packageTotal = kind === 'packing' && validCount(order) ? Number(countFor(order)) : 1;
          return <Paper key={`${order.orderId}-${packageIndex}`} className={`operations-report-order${index === 0 && packageIndex === 0 ? ' operations-report-first' : ''}`} withBorder p="lg" radius="md">
          <Group justify="space-between" align="start">
            <Group><Image src={LOGO_PATH} alt="לוגו זיס" w={70} h={45} fit="contain" /><Title order={2}>הזמנה {order.orderNumber}</Title>{kind === 'packing' && packageTotal > 1 && <Text fw={700} className="packing-package-number">אריזה {packageIndex + 1}/{packageTotal}</Text>}{order.isTest && <Badge color="orange">הזמנת ניסוי</Badge>}</Group>
            <Checkbox className="operations-report-controls" aria-label={`בחירת הזמנה ${order.orderNumber}`} checked={ui.selected.has(order.orderId)} onChange={(event) => ui.toggle(order.orderId, event.currentTarget.checked)} />
          </Group>
          <Group mt="sm"><Badge color={order.status === 'cancelled' ? 'red' : 'blue'}>{statusLabels[order.status]}</Badge><Text size="sm">{kind === 'packing' ? 'תאריך אריזה' : 'יצאה'}: {kind === 'packing' ? formatDate(order.transitionedAt) : formatTime(order.transitionedAt)}</Text>
            {kind === 'delivery' && <Text size="sm">אריזות: {order.packageCount ?? 'לא תועד'}</Text>}
            {kind === 'packing' && order.status === 'packed' && <Button className="operations-report-controls" size="xs" disabled={!validCount(order)} loading={advanceMutation.isPending} onClick={() => { if (window.confirm(`להעביר את הזמנה ${order.orderNumber} לסטטוס יצאה?`)) void advanceMutation.mutateAsync([order]); }}>העברה ידנית ליצאה</Button>}
          </Group>
          {kind === 'packing' && packageIndex === 0 && <NumberInput className="operations-report-controls" mt="sm" label="מספר אריזות למשלוח" description={`המינימום לפי תכולת ההזמנה הוא ${minimumPackageCount(order)}. הכמות תישמר במעבר ליצאה.`}
            value={countFor(order)} min={minimumPackageCount(order)} max={MAX_PACKAGE_COUNT} allowDecimal={false} allowNegative={false}
            error={validCount(order) ? undefined : `יש להזין מספר שלם בין ${minimumPackageCount(order)} ל־${MAX_PACKAGE_COUNT}.`}
            onChange={value => ui.setCount(order.orderId, value)} />}
          {order.status === 'cancelled' && <Alert color="red" mt="sm">ההזמנה בוטלה לאחר היציאה. יש לברר עם מנהל התפעול לפני אספקה.</Alert>}
          {kind === 'packing' && <Stack gap="xs" mt="md" className="packing-items">
            <Text fw={700}>מוצרים וכמויות לכל ההזמנה</Text>
            {order.bundles?.map(bundle => <Paper key={bundle.orderBundleId} withBorder p="sm" radius="sm" className="packing-bundle">
              <Text fw={700}>{bundle.bundleName}</Text><BundleCount quantity={bundle.quantity} />
              <Stack gap={2} ms="lg" ps="sm" style={{ borderInlineStart: '2px solid currentColor' }}>
                {bundle.components.map(component => <Text size="sm" key={component.productId}>{component.productName}: {component.quantity} למארז (סה״כ {component.quantity * bundle.quantity} יחידות)</Text>)}
              </Stack>
            </Paper>)}
            {Boolean(order.bundles?.length && order.items.length) && <Text fw={700}>מוצרים</Text>}
            {order.items.length > 0 &&
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead><Table.Tr><Table.Th>קטגוריה</Table.Th><Table.Th>מוצר</Table.Th><Table.Th>כמות</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>{order.items.map((item, itemIndex) => <Table.Tr key={itemIndex}>
                <Table.Td>{item.categoryName || 'ללא קטגוריה'}</Table.Td><Table.Td>{item.productName}</Table.Td>
                <Table.Td>{item.quantitySets} סטים</Table.Td>
              </Table.Tr>)}</Table.Tbody>
            </Table>}
            {order.dedicationText && <Text fw={600} style={{ whiteSpace: 'pre-wrap' }}>הקדשה: {order.dedicationText}</Text>}
          </Stack>}
          <div className={kind === 'packing' ? 'packing-fold-section' : 'delivery-address-section'}>
            {kind === 'packing' && <Text className="packing-fold-label" size="xs" c="dimmed">קו קיפול · פרטי אספקה</Text>}
            <Text fw={600}>תאריך אספקה: {order.deliveryDate}</Text><Text>{formatAddress(order)}</Text>
            {order.venueName && <Text>אולם: {order.venueName}</Text>}
            <Text>מזמין: {order.customerName} · טלפון המזמין: <span dir="ltr">{order.customerPhone}</span></Text><Text>טלפון זמין לקבלת המשלוח: <span dir="ltr">{order.deliveryPhone || order.customerPhone}</span></Text>
            {order.customerNotes && <Text style={{ whiteSpace: 'pre-wrap' }}>הערות: {order.customerNotes}</Text>}
          </div>
        </Paper>;
        })}
      </div>)}
    </>}
  </Stack>;
});

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('he-IL', { timeZone: BUSINESS_TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', { timeZone: BUSINESS_TIMEZONE, dateStyle: 'short' }).format(new Date(value));
}
function formatAddress(order: OperationReportOrder): string {
  const address = order.address;
  return [address.city, address.neighborhood, [address.street, address.houseNumber].filter(Boolean).join(' '), address.apartment && `דירה ${address.apartment}`, address.postalCode && `מיקוד ${address.postalCode}`].filter(Boolean).join(', ') || 'כתובת לא צוינה';
}
function cityPackageSummary(orders: OperationReportOrder[], city: string | null): string {
  const cityOrders = orders.filter((order) => order.address.city === city);
  const recorded = cityOrders.filter((order) => order.packageCount != null);
  const total = recorded.reduce((sum, order) => sum + (order.packageCount ?? 0), 0);
  const missing = cityOrders.length - recorded.length;
  return `כתובות לחלוקה: ${cityOrders.length} · אריזות מתועדות: ${total}${missing ? ` · ללא תיעוד במספר הזמנות: ${missing}` : ''}`;
}
