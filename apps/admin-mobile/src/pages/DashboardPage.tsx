import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconChefHat } from '@tabler/icons-react';
import { request, currentBusinessDate } from '../shared/api/http-client.js';
import type { Dashboard } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { OrderStatusBadge, statusLabels } from '../shared/components/OrderStatusBadge.js';
import { ManualTaskForm } from '../shared/components/ManualTaskForm.js';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const date = currentBusinessDate();
  const query = useQuery({ queryKey: ['dashboard', date], queryFn: () => request<Dashboard>(`/admin/dashboard?date=${date}`) });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  const data = query.data;
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between" align="end"><div><Text c="dimmed" size="sm">מסלול היום · {data.date}</Text><Title order={1}>בוקר טוב, מתחילים לזוז</Title></div><Button component={Link} to="/notifications" leftSection={<IconBell size={14} />} variant="light">{data.unreadNotificationCount} התראות שלא נקראו</Button></Group>
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      <Metric label="הזמנות היום" value={data.todayOrderCount} />
      {data.cancelledOrderCount > 0 && <Metric label="בוטלו" value={data.cancelledOrderCount} tone="red" />}
      <Metric label="דורש טיפול" value={data.openTaskCount ?? data.openTasks.length} tone="orange" />
      <Metric label="וריאציות לייצור" value={data.production.length} tone="teal" />
    </SimpleGrid>
    <Group aria-label="חלוקה לפי שלב תפעולי">{data.statusCounts.map(({ status, count }) => <Badge key={status} variant="light">{statusLabels[status]} · {count}</Badge>)}</Group>
    <Group><Button component={Link} to="/tasks" variant="light">כל משימות התפעול</Button></Group>
    <ManualTaskForm />
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Card withBorder radius="lg"><Group mb="md"><IconAlertTriangle size={20} color="var(--mantine-color-orange-6)" /><Title order={3}>דורש טיפול</Title></Group>{data.openTasks.length ? <Stack gap="xs">{data.openTasks.slice(0, 5).map((task) => <Alert key={task.taskId} color={task.priority === 'critical' ? 'red' : 'orange'} title={task.title}>{task.orderId ? `קשור להזמנה ${task.orderId}` : 'משימה כללית'}</Alert>)}</Stack> : <EmptyState>אין משימות פתוחות</EmptyState>}</Card>
      <Card withBorder radius="lg"><Group mb="md"><IconChefHat size={20} color="var(--mantine-color-teal-6)" /><Title order={3}>הבא בתור</Title></Group>{data.nextOrders.length ? <Stack gap="xs">{data.nextOrders.map((order) => <Group key={order.orderId} justify="space-between" className="list-row"><div><Text fw={600}>{order.orderNumber}</Text><Text size="sm" c="dimmed">{order.itemSummary}</Text></div><OrderStatusBadge order={order} /></Group>)}</Stack> : <EmptyState>אין הזמנות היום</EmptyState>}</Card>
    </SimpleGrid>
  </Stack>;
}

function Metric({ label, value, tone = 'blue' }: { label: string; value: number; tone?: string }) { return <Card withBorder radius="lg"><Text size="sm" c="dimmed">{label}</Text><Text size="xl" fw={700} c={tone}>{value}</Text></Card>; }
