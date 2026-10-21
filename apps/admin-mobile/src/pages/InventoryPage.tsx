import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Alert, Badge, Button, Group, Pagination, Paper, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { Link, useSearchParams } from 'react-router-dom';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import type { InventoryVariant, InventoryVariantDetails, InventoryVariantList } from '../features/inventory/inventory.types.js';
import { InventoryAdjustmentForm } from '../features/inventory/InventoryAdjustmentForm.js';

export const InventoryPage = observer(function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const weekStartDate = params.get('weekStartDate') ?? currentBusinessDate();
  const selectedId = params.get('variant') ?? '';
  const ui = useLocalObservable(() => ({ page: 1, historyPage: 1, setPage(value: number) { this.page = value; }, setHistoryPage(value: number) { this.historyPage = value; } }));
  const listing = useQuery({ queryKey: ['inventory-admin', 'list', weekStartDate, ui.page], queryFn: ({ signal }) => request<InventoryVariantList>(`/admin/inventory/variants?${new URLSearchParams({ weekStartDate, page: String(ui.page) })}`, { signal }) });
  const details = useQuery({ queryKey: ['inventory-admin', 'details', selectedId, weekStartDate, ui.historyPage], enabled: Boolean(selectedId),
    queryFn: ({ signal }) => request<InventoryVariantDetails>(`/admin/inventory/variants/${selectedId}?${new URLSearchParams({ weekStartDate, page: String(ui.historyPage) })}`, { signal }) });
  useEffect(() => { ui.setPage(1); }, [weekStartDate, ui]);
  useEffect(() => { ui.setHistoryPage(1); }, [selectedId, weekStartDate, ui]);
  useEffect(() => {
    if (listing.data && ui.page > Math.max(1, listing.data.page.totalPages)) ui.setPage(Math.max(1, listing.data.page.totalPages));
  }, [listing.data, ui.page, ui]);
  useEffect(() => {
    if (details.data && ui.historyPage > Math.max(1, details.data.page.totalPages)) ui.setHistoryPage(Math.max(1, details.data.page.totalPages));
  }, [details.data, ui.historyPage, ui]);
  const select = (id: string) => { ui.setHistoryPage(1); setParams({ weekStartDate, ...(id ? { variant: id } : {}) }); };
  return <Stack gap="lg">
    <Group justify="space-between"><Title order={1}>מלאי וקיבולת ייצור</Title><Button variant="default" loading={listing.isFetching || (Boolean(selectedId) && details.isFetching)} onClick={() => { void listing.refetch(); if (selectedId) void details.refetch(); }}>רענון</Button></Group>
    <TextInput type="date" label="תחילת השבוע של רשומת הקיבולת" value={weekStartDate} onChange={(event) => { ui.setPage(1); ui.setHistoryPage(1); setParams({ weekStartDate: event.currentTarget.value, ...(selectedId ? { variant: selectedId } : {}) }); }} />
    <Alert color="blue">קיבולת ייצור והקצאות הן נתוני תכנון. הן אינן נוספות למלאי הזמין. אישור מילוי שבועי, כולל אישור חלקי, טרם מומש.</Alert>
    <Button component={Link} to="/catalog" variant="subtle">ניהול מוצרים, ספים וכמויות ברירת מחדל</Button>
    {listing.isPending ? <LoadingState /> : listing.isError ? <ErrorState message={listing.error.message} /> : <>
      {!listing.data.data.length ? <EmptyState>אין וריאציות מלאי להצגה.</EmptyState> : <SimpleGrid cols={{ base: 1, sm: 2 }}>{listing.data.data.map((variant) => <Paper key={variant.productVariantId} withBorder p="md"><Stack gap="sm">
        <Group justify="space-between"><Title order={3}>{variant.productName} · {variant.variantName}</Title>{variant.availableSets <= variant.lowStockThresholdSets && <Badge color="red">מלאי נמוך</Badge>}</Group>
        <Text size="sm">קוד: {variant.productCode} · סטטוס: {variant.status}</Text><InventoryFigures variant={variant} />
        <Button variant={selectedId === variant.productVariantId ? 'filled' : 'light'} onClick={() => select(variant.productVariantId)}>פרטים, היסטוריה ועדכון</Button>
      </Stack></Paper>)}</SimpleGrid>}
      {listing.data.page.totalPages > 1 && <Pagination total={listing.data.page.totalPages} value={ui.page} onChange={ui.setPage} />}
    </>}
    {selectedId && <Stack gap="md">
      <Group justify="space-between"><Title order={2}>פרטי מלאי</Title><Button variant="subtle" onClick={() => select('')}>סגירת הפרטים</Button></Group>
      {details.isPending ? <LoadingState /> : details.isError ? <ErrorState message={details.error.message} /> : <>
        <Title order={3}>{details.data.variant.productName} · {details.data.variant.variantName}</Title>
        <InventoryFigures variant={details.data.variant} />
        <InventoryAdjustmentForm key={selectedId} variant={details.data.variant} />
        <Title order={3}>היסטוריית תנועות · {details.data.page.totalItems}</Title>
        {!details.data.movements.length ? <EmptyState>אין תנועות מלאי לווריאציה זו.</EmptyState> : details.data.movements.map((movement) => <Paper key={movement.movementId} withBorder p="md"><Stack gap="xs">
          <Group justify="space-between"><Text fw={600}>{movement.movementType}</Text><Text size="sm">{formatTime(movement.createdAt)}</Text></Group>
          <Text>לפני: {movement.stockBefore ?? 'לא תועד'} · אחרי: {movement.stockAfter} Sets</Text><Text>סיבה: {movement.reason || 'לא תועדה'}</Text>
          <Text size="xs" c="dimmed">מבצע: {movement.createdBy || 'מערכת / לא תועד'}</Text>
          {movement.orderId && <Button component={Link} to={`/orders/${movement.orderId}`} variant="subtle">פתיחת ההזמנה</Button>}
        </Stack></Paper>)}
        {details.data.page.totalPages > 1 && <Pagination total={details.data.page.totalPages} value={ui.historyPage} onChange={ui.setHistoryPage} />}
      </>}
    </Stack>}
  </Stack>;
});
function InventoryFigures({ variant }: { variant: InventoryVariant }) {
  return <Stack gap="xs"><Text fw={700}>זמין בפועל: {variant.availableSets} Sets</Text>
    <Text>תוספת ברירת מחדל: {variant.defaultProductionQuantitySets} · סף התראה: {variant.lowStockThresholdSets}</Text>
    <Text>קיבולת הייצור לשבוע שנבחר: {variant.weeklyCapacity ? `${variant.weeklyCapacity.capacitySets} Sets (${variant.weeklyCapacity.isActive ? 'פעילה' : 'לא פעילה'})` : 'לא הוגדרה'}</Text>
    <Text>הקצאות ייצור פעילות בחלון 7 ימים: {variant.allocatedSets} Sets</Text>
    <Text size="sm" c="dimmed">מילוי מלאי מתוכנן ומאושר: טרם מומש; אין להסיק זמינות מקיבולת או הקצאות.</Text></Stack>;
}
function formatTime(value: string) { return new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }