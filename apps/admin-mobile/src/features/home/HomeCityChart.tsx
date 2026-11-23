import { useState } from 'react';
import { Button, Card, Group, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { OrderStatusBadge } from '../../shared/components/OrderStatusBadge.js';
import type { HomeOrder } from './home.types.js';
import { summarizeCities } from './home-analytics.js';

export function HomeCityChart({ orders, date, mode, from, to, onDate, onMode, onToday, onOpen }: {
  orders: HomeOrder[]; date: string; mode: 'day' | 'week'; from: string; to: string;
  onDate: (value: string) => void; onMode: (value: 'day' | 'week') => void; onToday: () => void; onOpen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const counts = summarizeCities(orders);
  const max = Math.max(1, ...counts.map(item => item.count));
  const selectedOrders = counts.find(item => item.city === selected)?.orders ?? [];
  return <Card withBorder radius="lg" className="home-panel" id="home-cities">
    <Group justify="space-between" mb="sm"><div><Title order={2}>הזמנות לפי עיר</Title><Text size="sm" c="dimmed">לפי תאריך האספקה</Text></div><Text fw={700}>{counts.reduce((sum, item) => sum + item.count, 0)} הזמנות</Text></Group>
    <Group align="end" mb="md"><SegmentedControl aria-label="טווח ערים" value={mode} onChange={value => { setSelected(null); onMode(value as 'day' | 'week'); }} data={[{ value: 'day', label: 'יומי' }, { value: 'week', label: 'שבועי' }]} />
      <TextInput label="תאריך" type="date" value={date} onChange={event => { if (event.currentTarget.value) { setSelected(null); onDate(event.currentTarget.value); } }} />
      <Button variant="subtle" onClick={() => { setSelected(null); onToday(); }}>היום</Button></Group>
    <Text size="xs" c="dimmed" mb="md">{from === to ? from : `מהיום הנבחר ועד שבעה ימים אחריו · ${from}–${to}`}</Text>
    {!counts.length ? <Text c="dimmed" py="md">אין הזמנות בטווח שנבחר.</Text> : <div className="home-city-bars">{counts.map(({ city, count }) => <button key={city} type="button" className="home-city-bar" aria-pressed={selected === city} onClick={() => setSelected(selected === city ? null : city)}><span>{city}</span><span className="home-city-track"><i style={{ width: `${count / max * 100}%` }} /></span><b>{count}</b></button>)}</div>}
    {selected && <div className="home-breakdown"><Title order={3}>{selected} · {selectedOrders.length} הזמנות</Title><Stack gap="xs" mt="sm">{selectedOrders.map(order => <Group key={order.orderId} justify="space-between" className="home-break-row"><div><Button variant="subtle" size="compact-sm" onClick={() => onOpen(order.orderId)}>{order.orderNumber}</Button><Text size="xs">{order.address}, {order.city} · אספקה {order.deliveryDate}</Text></div><OrderStatusBadge order={order} /></Group>)}</Stack></div>}
  </Card>;
}
