import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Group, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBell } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { currentBusinessDate, request } from '../../shared/api/http-client.js';
import type { Dashboard } from '../../entities/admin.types.js';
import type { DisplayStage } from './order-stage.js';
import { ErrorState, LoadingState } from '../../shared/components/StateMessage.js';
import { HomeStageChart } from './HomeStageChart.js';
import { HomeProductionChart } from './HomeProductionChart.js';
import { HomeCityChart } from './HomeCityChart.js';
import { HomeTasks } from './HomeTasks.js';
import { getHomeOrders, getHomeTasks, range } from './home-data.js';
import { DetailedOrderPage } from './DetailedOrderPage.js';
import './home.css';

export function HomeDashboardPage() {
  const today = currentBusinessDate();
  const mobile = useMediaQuery('(max-width: 47.99em)');
  const [selectedStatus, setSelectedStatus] = useState<DisplayStage>('in_preparation');
  const [productionDate, setProductionDate] = useState(today), [productionMode, setProductionMode] = useState<'day' | 'week'>('day');
  const [cityDate, setCityDate] = useState(today), [cityMode, setCityMode] = useState<'day' | 'week'>('day');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [productionFrom, productionTo] = range(productionDate, productionMode);
  const [cityFrom, cityTo] = range(cityDate, cityMode);
  const todayQuery = useQuery({ queryKey: ['home-orders', today, today], queryFn: ({ signal }) => getHomeOrders(today, today, signal) });
  const productionQuery = useQuery({ queryKey: ['home-orders', productionFrom, productionTo], queryFn: ({ signal }) => getHomeOrders(productionFrom, productionTo, signal) });
  const cityQuery = useQuery({ queryKey: ['home-orders', cityFrom, cityTo], queryFn: ({ signal }) => getHomeOrders(cityFrom, cityTo, signal) });
  const taskQuery = useQuery({ queryKey: ['home-tasks'], queryFn: ({ signal }) => getHomeTasks(signal) });
  const summaryQuery = useQuery({ queryKey: ['dashboard', today], queryFn: ({ signal }) => request<Dashboard>(`/admin/dashboard?date=${today}`, { signal }) });
  const todayOrders = todayQuery.data?.orders ?? [];
  const activeToday = todayOrders.filter(order => order.status !== 'cancelled');
  const activeTasks = (taskQuery.data ?? []).filter(task => task.status !== 'closed');
  return <Stack gap="lg" className="home-page">
    <Group justify="space-between" align="end"><div><Text size="sm" c="dimmed">מסלול היום · {today}</Text><Title order={1}>בוקר טוב, מתחילים לזוז</Title><Text c="dimmed">ההזמנות, ההכנות והמשימות של היום.</Text></div>
      <Button component={Link} to="/notifications" variant="light" leftSection={<IconBell size={16} />}>{summaryQuery.data?.unreadNotificationCount ?? 0} התראות שלא נקראו</Button></Group>
    {todayQuery.isPending ? <LoadingState /> : todayQuery.isError ? <ErrorState message={todayQuery.error.message} /> : <>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Metric label="הזמנות היום" count={activeToday.length} note="לא כולל הזמנות שבוטלו" emphasis />
        <Metric label="ממתינות / בהכנה" count={activeToday.filter(order => order.paymentStatus === 'paid' && ['ordered', 'in_preparation'].includes(order.status)).length} note="שולמו ודורשות הכנה" />
        <Metric label="דורש טיפול" count={activeTasks.length} note="משימות פתוחות ובטיפול" />
        <Metric label="מוכנות ליציאה" count={activeToday.filter(order => order.status === 'packed').length} note="הזמנות שכבר נארזו" />
      </SimpleGrid>
      <div className="home-attention"><b>! דורש טיפול · {activeTasks.length}</b>{activeTasks.slice(0, 3).map(task => <a key={task.taskId} href="#home-tasks">{task.title} ←</a>)}{!activeTasks.length && <span>אין משימות פעילות.</span>}</div>
      <HomeStageChart orders={todayOrders} date={today} selected={selectedStatus} onSelect={setSelectedStatus} onOpen={setOpenOrderId} />
    </>}
    {productionQuery.isPending ? <LoadingState /> : productionQuery.isError ? <ErrorState message={productionQuery.error.message} /> :
      <HomeProductionChart orders={productionQuery.data.orders} date={productionDate} mode={productionMode} from={productionFrom} to={productionTo}
        onDate={setProductionDate} onMode={setProductionMode} onToday={() => { setProductionDate(today); setProductionMode('day'); }} onOpen={setOpenOrderId} />}
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      {cityQuery.isPending ? <LoadingState /> : cityQuery.isError ? <ErrorState message={cityQuery.error.message} /> :
        <HomeCityChart orders={cityQuery.data.orders} date={cityDate} mode={cityMode} from={cityFrom} to={cityTo}
          onDate={setCityDate} onMode={setCityMode} onToday={() => { setCityDate(today); setCityMode('day'); }} onOpen={setOpenOrderId} />}
      <Card withBorder radius="lg" className="home-panel home-reserved"><Title order={2}>חוסרים וחריגים</Title><Text c="dimmed">נגדיר יחד בהמשך.</Text></Card>
    </SimpleGrid>
    {taskQuery.isPending ? <LoadingState /> : <HomeTasks tasks={taskQuery.data ?? []} error={taskQuery.isError ? taskQuery.error.message : undefined} />}
    <Modal opened={Boolean(openOrderId)} onClose={() => setOpenOrderId(null)} title="פרטי הזמנה" size="xl" fullScreen={Boolean(mobile)}>
      {openOrderId && <DetailedOrderPage selectedOrderId={openOrderId} itemImages={todayOrders.find(order => order.orderId === openOrderId)?.items ?? productionQuery.data?.orders.find(order => order.orderId === openOrderId)?.items ?? cityQuery.data?.orders.find(order => order.orderId === openOrderId)?.items ?? []} />}
    </Modal>
    {summaryQuery.isError && <Alert color="orange">מונה ההתראות אינו זמין כרגע.</Alert>}
  </Stack>;
}

function Metric({ label, count, note, emphasis = false }: { label: string; count: number; note: string; emphasis?: boolean }) {
  return <Card withBorder radius="lg" className={emphasis ? 'home-metric home-metric-emphasis' : 'home-metric'}>
    <Text size="sm">{label}</Text><Text size="xl" fw={700}>{count}</Text><Text size="xs">{note}</Text>
  </Card>;
}
