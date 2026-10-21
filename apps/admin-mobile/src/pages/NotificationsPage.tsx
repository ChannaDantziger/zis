import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Group, Pagination, Select, Stack, Switch, Text, Title } from '@mantine/core';
import { IconBell, IconRefresh } from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { request } from '../shared/api/http-client.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { notificationsUiStore as ui } from '../features/notifications/notifications-ui.store.js';
import type { NotificationFilter, NotificationPage, NotificationPreferences } from '../features/notifications/notifications.types.js';

const FILTER_OPTIONS = [{ value: 'all', label: 'כל ההתראות' }, { value: 'unread', label: 'טרם נקראו' }, { value: 'read', label: 'נקראו' }];
const TYPE_LABELS: Record<string, string> = { low_stock: 'מלאי נמוך', inventory_risk: 'סיכון מלאי', late_paid_order: 'תשלום מאוחר', new_order: 'הזמנה חדשה', system: 'מערכת' };
const israeliTime = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });

export const NotificationsPage = observer(function NotificationsPage() {
  const client = useQueryClient();
  const { page, filter } = ui;
  const query = useQuery({ queryKey: ['notifications', filter, page], queryFn: ({ signal }) => request<NotificationPage>(`/admin/notifications?${new URLSearchParams({ filter, page: String(page) })}`, { signal }) });
  const preferences = useQuery({ queryKey: ['notification-preferences'], queryFn: ({ signal }) => request<NotificationPreferences>('/admin/notifications/preferences', { signal }) });
  const totalPages = query.data?.page.totalPages;
  useEffect(() => { if (totalPages !== undefined && page > Math.max(1, totalPages)) ui.setPage(Math.max(1, totalPages)); }, [page, totalPages]);
  const markRead = useMutation({
    mutationFn: (id: string) => request(`/admin/notifications/${id}/read`, { method: 'PATCH', body: '{}' }),
    onSuccess: () => { for (const key of ['notifications', 'dashboard']) client.invalidateQueries({ queryKey: [key] }); },
  });
  const save = useMutation({
    mutationFn: (draft: Partial<NotificationPreferences>) => request<NotificationPreferences>('/admin/notifications/preferences', { method: 'PATCH', body: JSON.stringify(draft) }),
    onSuccess: (result) => { client.setQueryData(['notification-preferences'], result); ui.clearDraft(); },
  });
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between"><Group><IconBell size={28} /><Title order={1}>ההתראות שלי</Title></Group>
      <Button variant="subtle" loading={query.isFetching} leftSection={<IconRefresh size={16} />} onClick={() => query.refetch()}>רענון</Button>
    </Group>
    <Alert color="blue" title="התראות בתוך מערכת הניהול">המסך מציג התראות שנוצרו עבורך. שליחת Push למכשיר עדיין אינה מחוברת; שינוי ההעדפות אינו מפעיל שליחה או הרשאה בדפדפן.</Alert>
    <Card withBorder><Stack>
      <Title order={2} size="h4">העדפות Push עתידיות</Title>
      {preferences.isPending ? <LoadingState /> : preferences.isError ? <ErrorState message={preferences.error.message} /> : <>
        <Switch label="הודעה על הזמנה חדשה" checked={ui.draft.pushNewOrderEnabled ?? preferences.data.pushNewOrderEnabled} disabled={save.isPending} onChange={(event) => ui.setNewOrder(event.currentTarget.checked)} />
        <Switch label="הודעה על מצב הדורש פעולה" checked={ui.draft.pushActionRequiredEnabled ?? preferences.data.pushActionRequiredEnabled} disabled={save.isPending} onChange={(event) => ui.setActionRequired(event.currentTarget.checked)} />
        <Group><Button loading={save.isPending} disabled={!Object.keys(ui.draft).length} onClick={() => save.mutate({ ...ui.draft })}>שמירת העדפות</Button>
          <Button variant="subtle" disabled={save.isPending || !Object.keys(ui.draft).length} onClick={() => ui.clearDraft()}>ביטול שינויים</Button></Group>
        {save.isError && <Alert color="red">{save.error.message}</Alert>}
        {save.isSuccess && !Object.keys(ui.draft).length && <Text c="teal">ההעדפות נשמרו. שליחת Push עדיין אינה מחוברת.</Text>}
      </>}
    </Stack></Card>
    <Group justify="space-between"><Select label="מצב קריאה" value={filter} data={FILTER_OPTIONS} allowDeselect={false} disabled={markRead.isPending} onChange={(value) => { if (value) ui.setFilter(value as NotificationFilter); }} />
      <Text>{query.data?.unreadCount ?? 0} התראות שלא נקראו</Text></Group>
    {markRead.isError && <Alert color="red">{markRead.error.message}</Alert>}
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : <>
      <Text c="dimmed">{query.data.page.totalItems} התראות במסנן הנוכחי</Text>
      {query.data.data.length ? query.data.data.map((notification) => <Card key={notification.notificationId} withBorder>
        <Stack gap="xs"><Group justify="space-between"><Text fw={700}>{notification.title}</Text>
          <Group><Badge variant="light">{TYPE_LABELS[notification.notificationType] ?? 'התראה'}</Badge><Badge color={notification.readAt ? 'gray' : 'orange'}>{notification.readAt ? 'נקראה' : 'חדשה'}</Badge></Group></Group>
          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{notification.body}</Text>
          <Text size="xs" c="dimmed">{formatTime(notification.createdAt)} · שעון ישראל</Text>
          <Group>{notification.orderId && <Button component={Link} to={`/orders/${notification.orderId}`} variant="subtle">פתיחת הזמנה</Button>}
            {!notification.readAt && <Button variant="light" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.notificationId)}>סימון כנקראה</Button>}</Group>
        </Stack>
      </Card>) : <EmptyState>אין התראות במצב הקריאה שנבחר</EmptyState>}
      {query.data.page.totalPages > 1 && <Pagination total={query.data.page.totalPages} value={page} disabled={markRead.isPending} onChange={(value) => ui.setPage(value)} aria-label="עמודי התראות" />}
    </>}
  </Stack>;
});
function formatTime(value: string): string { const date = new Date(value); return Number.isFinite(date.getTime()) ? israeliTime.format(date) : 'מועד לא ידוע'; }