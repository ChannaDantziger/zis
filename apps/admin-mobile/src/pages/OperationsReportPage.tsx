import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Accordion, Alert, Badge, Button, Checkbox, Group, Image, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowRight, IconPrinter, IconRefresh } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { OperationReport, OperationReportKind, OperationReportOrder } from '../entities/operations-reports.types.js';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { statusLabels } from '../shared/components/OrderStatusBadge.js';
import './operations-report.css';

const MAX_SELECTION = 100;
const LOGO_PATH = '/zis-logo-dark.png';
const BUSINESS_TIMEZONE = 'Asia/Jerusalem';

export function PackingReportPage() { return <OperationsReportPage kind="packing" />; }
export function DeliveryReportPage() { return <OperationsReportPage kind="delivery" />; }

const OperationsReportPage = observer(function OperationsReportPage({ kind }: { kind: OperationReportKind }) {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? currentBusinessDate();
  const city = params.get('city') ?? '';
  const selectedIds = params.get('orderIds') ?? '';
  const ui = useLocalObservable(() => ({
    city: '', selected: new Set<string>(),
    toggle(id: string, checked: boolean) { if (checked) this.selected.add(id); else this.selected.delete(id); },
    clear() { this.selected.clear(); },
    setCity(value: string) { this.city = value; },
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
        <Button disabled={!query.isSuccess || query.isFetching || ui.selected.size > 0} leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>הדפסה / שמירה כ־PDF</Button>
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
        <Text size="sm">{kind === 'packing' ? 'הזמנות ששולמו ועברו אריזה. הפקה חוזרת אינה משנה סטטוס.' : 'לפי היסטוריית יציאה למשלוח ביום הנבחר; מוצג גם המצב הנוכחי של כל הזמנה.'}</Text>
      </div>
      {!report.orders.length && <Paper withBorder p="lg"><Text>אין הזמנות מתאימות לדוח זה.</Text></Paper>}
      {report.orders.map((order, index) => <div key={order.orderId}>
        {kind === 'delivery' && (index === 0 || report.orders[index - 1].address.city !== order.address.city) && <Title order={2} className="delivery-city-heading">{order.address.city || 'עיר לא צוינה'}</Title>}
        <Paper className={`operations-report-order${index === 0 ? ' operations-report-first' : ''}`} withBorder p="lg" radius="md">
          <Group justify="space-between" align="start">
            <Group><Image src={LOGO_PATH} alt="לוגו זיס" w={70} h={45} fit="contain" /><Title order={2}>הזמנה {order.orderNumber}</Title></Group>
            <Checkbox className="operations-report-controls" aria-label={`בחירת הזמנה ${order.orderNumber}`} checked={ui.selected.has(order.orderId)} onChange={(event) => ui.toggle(order.orderId, event.currentTarget.checked)} />
          </Group>
          <Group mt="sm"><Badge color={order.status === 'cancelled' ? 'red' : 'blue'}>{statusLabels[order.status]}</Badge><Text size="sm">{kind === 'packing' ? 'נארזה' : 'יצאה'}: {formatTime(order.transitionedAt)}</Text></Group>
          {order.status === 'cancelled' && <Alert color="red" mt="sm">ההזמנה בוטלה לאחר היציאה. יש לברר עם מנהל התפעול לפני אספקה.</Alert>}
          {kind === 'packing' && <Stack gap="xs" mt="md">
            {order.items.map((item, itemIndex) => <Text key={itemIndex}>{item.productName} · {item.variantName} · {item.quantitySets} Sets × {item.setSize} יחידות</Text>)}
            <Text fw={600} style={{ whiteSpace: 'pre-wrap' }}>הקדשה: {order.dedicationText || 'ללא הקדשה'}</Text>
          </Stack>}
          <div className={kind === 'packing' ? 'packing-fold-section' : 'delivery-address-section'}>
            {kind === 'packing' && <Text className="packing-fold-label" size="xs" c="dimmed">קו קיפול · פרטי אספקה</Text>}
            <Text fw={600}>תאריך אספקה: {order.deliveryDate}</Text><Text>{formatAddress(order)}</Text>
            {order.venueName && <Text>אולם: {order.venueName}</Text>}
            <Text>איש קשר: {order.customerName} · <span dir="ltr">{order.customerPhone}</span></Text>
            {order.customerNotes && <Text style={{ whiteSpace: 'pre-wrap' }}>הערות: {order.customerNotes}</Text>}
          </div>
        </Paper>
      </div>)}
    </>}
  </Stack>;
});

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('he-IL', { timeZone: BUSINESS_TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
function formatAddress(order: OperationReportOrder): string {
  const address = order.address;
  return [address.city, address.neighborhood, [address.street, address.houseNumber].filter(Boolean).join(' '), address.apartment && `דירה ${address.apartment}`, address.postalCode && `מיקוד ${address.postalCode}`].filter(Boolean).join(', ') || 'כתובת לא צוינה';
}
