import { useState } from 'react';
import { Button, Card, Group, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { OrderStatusBadge } from '../../shared/components/OrderStatusBadge.js';
import type { HomeOrder } from './home.types.js';
import { summarizeProduction } from './home-analytics.js';
import { Link } from 'react-router-dom';

export function HomeProductionChart({ orders, date, mode, from, to, onDate, onMode, onToday, onOpen }: {
  orders: HomeOrder[]; date: string; mode: 'day' | 'week'; from: string; to: string;
  onDate: (value: string) => void; onMode: (value: 'day' | 'week') => void; onToday: () => void; onOpen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const groups = summarizeProduction(orders);
  const selectedGroup = groups.find(group => group.key === selected);
  const categories = [...new Set(groups.map(group => group.category))];
  return <Card withBorder radius="lg" className="home-panel" id="home-production">
    <Group justify="space-between" mb="sm"><div><Title order={2}>כמויות לייצור</Title><Text size="sm" c="dimmed">כמה הוזמן וכמה עוד צריך להכין</Text></div><Group>
      <Text fw={700}>{groups.reduce((sum, group) => sum + group.remainingSets, 0)} סטים להכנה</Text>
      <Button component={Link} to={`/production/print?${new URLSearchParams({ date })}`} variant="default">דוח ייצור להדפסה</Button>
    </Group></Group>
    <Group align="end" mb="md"><SegmentedControl aria-label="טווח ייצור" value={mode} onChange={value => { setSelected(null); onMode(value as 'day' | 'week'); }} data={[{ value: 'day', label: 'יומי' }, { value: 'week', label: 'שבועי' }]} />
      <TextInput label="תאריך" type="date" value={date} onChange={event => { if (event.currentTarget.value) { setSelected(null); onDate(event.currentTarget.value); } }} />
      <Button variant="subtle" onClick={() => { setSelected(null); onToday(); }}>היום</Button></Group>
    <Text size="xs" c="dimmed" mb="md">{from === to ? from : `מהיום הנבחר ועד שבעה ימים אחריו · ${from}–${to}`}</Text>
    {!groups.length ? <Text c="dimmed" py="md">אין סטים שהוזמנו בטווח שנבחר.</Text> : categories.map(category => <section key={category} className="home-category"><Title order={3} mb="sm">{category}</Title><SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
      {groups.filter(group => group.category === category).map(group => <button key={group.key} className="home-product-tile" type="button" aria-pressed={selected === group.key} onClick={() => setSelected(selected === group.key ? null : group.key)}>
        {group.imageUrl ? <img src={group.imageUrl} alt={group.name} /> : <div className="home-image-empty" aria-hidden="true">תמונה חסרה</div>}
        <b>{group.name}</b><strong>הוזמנו {group.orderedSets} סטים</strong><small>נותרו להכנה {group.remainingSets} · לחצי לפירוט</small>
      </button>)}</SimpleGrid></section>)}
    {selectedGroup && <div className="home-breakdown"><Title order={3}>{selectedGroup.name} · הוזמנו {selectedGroup.orderedSets} סטים · נותרו להכנה {selectedGroup.remainingSets}</Title><Stack gap="xs" mt="sm">{selectedGroup.lines.map(({ order, item }) => <Group key={item.orderItemId} justify="space-between" className="home-break-row"><div><Button variant="subtle" size="compact-sm" onClick={() => onOpen(order.orderId)}>{order.orderNumber}</Button><Text size="xs" c="dimmed">אספקה {order.deliveryDate}</Text></div><Group gap="xs"><Text fw={700}>{item.quantitySets} סטים</Text><OrderStatusBadge order={order} /></Group></Group>)}</Stack></div>}
  </Card>;
}
