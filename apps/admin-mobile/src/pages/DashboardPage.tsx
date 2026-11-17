import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Group, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconAlertTriangle, IconBell, IconChefHat } from '@tabler/icons-react';
import { request, currentBusinessDate } from '../shared/api/http-client.js';
import type { Dashboard } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { OrderStatusBadge, statusLabels } from '../shared/components/OrderStatusBadge.js';
import { ManualTaskForm } from '../shared/components/ManualTaskForm.js';
import { Link, useSearchParams } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import { OrderDetailsPage } from './OrderDetailsPage.js';

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const mobile = useMediaQuery("(max-width: 47.99em)");
  const date = currentBusinessDate();
  const query = useQuery({ queryKey: ['dashboard', date], queryFn: () => request<Dashboard>(`/admin/dashboard?date=${date}`) });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  const data = query.data;
  const task = data.openTasks.find((item) => item.taskId === params.get("task"));
  const order = data.nextOrders.find((item) => item.orderId === params.get("order"));
  const closeDetails = () => setParams({}, { replace: true });
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between" align="end"><div><Text c="dimmed" size="sm">מסלול היום · {data.date}</Text><Title order={1}>בוקר טוב, מתחילים לזוז</Title></div><Button component={Link} to="/notifications" leftSection={<IconBell size={14} />} variant="light">{data.unreadNotificationCount} התראות שלא נקראו</Button></Group>
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      <Metric label="הזמנות היום" value={data.todayOrderCount} />
      {data.cancelledOrderCount > 0 && <Metric label="בוטלו" value={data.cancelledOrderCount} tone="red" />}
      <Metric label="דורש טיפול" value={data.openTaskCount ?? data.openTasks.length} tone="orange" />
      <Metric label="מוצרים לייצור" value={new Set(data.production.map((item) => item.productName)).size} tone="teal" />
    </SimpleGrid>
    <Group aria-label="חלוקה לפי שלב תפעולי">{data.statusCounts.map(({ status, count }) => <Badge key={status} variant="light">{statusLabels[status]} · {count}</Badge>)}</Group>
    <Group><Button component={Link} to="/tasks" variant="light">כל משימות התפעול</Button></Group>
    <ManualTaskForm />
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Card withBorder radius="lg"><Group mb="md"><IconAlertTriangle size={20} color="var(--mantine-color-orange-6)" /><Title order={3}>דורש טיפול</Title></Group>{data.openTasks.length ? <Stack gap="xs">{data.openTasks.slice(0, 5).map((task) => <Button key={task.taskId} variant="light" color={task.priority === 'critical' ? 'red' : 'orange'} h="auto" py="sm" styles={{ label: { whiteSpace: "normal", textAlign: "start" } }} onClick={() => setParams({ task: task.taskId })}>{task.title}</Button>)}</Stack> : <EmptyState>אין משימות פתוחות</EmptyState>}</Card>
      <Card withBorder radius="lg"><Group mb="md"><IconChefHat size={20} color="var(--mantine-color-teal-6)" /><Title order={3}>הבא בתור</Title></Group>{data.nextOrders.length ? <Stack gap="xs">{data.nextOrders.map((order) => <Card key={order.orderId} component="button" type="button" withBorder ta="start" onClick={() => setParams({ order: order.orderId })}><Group justify="space-between" className="list-row"><div><Text fw={600}>{order.orderNumber}</Text><Text size="sm" c="dimmed">{order.itemSummary}</Text></div><OrderStatusBadge order={order} /></Group></Card>)}</Stack> : <EmptyState>אין הזמנות היום</EmptyState>}</Card>
    </SimpleGrid>
    <Modal opened={!!task || !!order} onClose={closeDetails} fullScreen={!!mobile} size="xl" title={task ? 'פרטי משימה' : 'פרטי אירוע / הזמנה'}>
      <Stack>{mobile && <Button variant="subtle" leftSection={<IconArrowRight size={18} />} onClick={closeDetails}>חזרה למסלול היום</Button>}
        {task && <><Title order={2}>{task.title}</Title><Text>{task.priority === 'critical' ? 'דחופה' : task.priority === 'high' ? 'עדיפות גבוהה' : 'עדיפות רגילה'}</Text>
          <Button component={Link} to="/tasks" variant="light">פתיחת משימות לטיפול</Button>
          {task.orderId && <OrderDetailsPage selectedOrderId={task.orderId} />}</>}
        {order && <OrderDetailsPage selectedOrderId={order.orderId} />}
      </Stack>
    </Modal>
  </Stack>;
}

function Metric({ label, value, tone = 'blue' }: { label: string; value: number; tone?: string }) { return <Card withBorder radius="lg"><Text size="sm" c="dimmed">{label}</Text><Text size="xl" fw={700} c={tone}>{value}</Text></Card>; }
