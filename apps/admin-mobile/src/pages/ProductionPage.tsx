import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertTriangle, IconChefHat, IconRefresh } from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import type { ProductionItem } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { adminUiStore } from '../stores/admin-ui.store.js';

export const ProductionPage = observer(function ProductionPage() {
  const date = adminUiStore.productionDate;
  const query = useQuery({
    queryKey: ['production', date],
    queryFn: ({ signal }) => request<ProductionItem[]>(`/admin/production?date=${date}`, { signal }),
  });
  const products = query.data?.reduce((groups, item) => {
    const existing = groups.get(item.productName);
    if (existing) { existing.requiredSets += item.requiredSets; existing.hasOpenTask ||= item.hasOpenTask; }
    else groups.set(item.productName, { productName: item.productName, requiredSets: item.requiredSets, hasOpenTask: item.hasOpenTask });
    return groups;
  }, new Map<string, { productName: string; requiredSets: number; hasOpenTask: boolean }>());
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between">
      <Group><IconChefHat size={28} color="var(--mantine-color-orange-6)" /><div>
        <Text c="dimmed" size="sm">ייצור לפי יום · {date}</Text>
        <Title order={1}>מה צריך להכין</Title>
      </div></Group>
      <Group>
        <Button component={Link} to={`/production/print?${new URLSearchParams({ date })}`} variant="default">רשימה להדפסה / PDF</Button>
        <Button variant="subtle" leftSection={<IconRefresh size={16} />} loading={query.isFetching} onClick={() => query.refetch()}>רענון</Button>
      </Group>
    </Group>
    <Group align="end">
      <TextInput type="date" label="תאריך ייצור / אספקה" value={date} onChange={(event) => {
        if (event.currentTarget.value) adminUiStore.setProductionDate(event.currentTarget.value);
      }} />
      <Button variant="subtle" onClick={() => adminUiStore.setProductionDate(currentBusinessDate())}>חזרה להיום</Button>
    </Group>
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> :
      products?.size ? <Stack>{[...products.values()].map((item) => <Card key={item.productName} withBorder radius="lg">
        <Group justify="space-between">
          <Text fw={700}>{item.productName}</Text>
          <Group><Text size="xl" fw={700}>{item.requiredSets}</Text><Text size="sm" c="dimmed">Sets להכנה</Text>
            {item.hasOpenTask && <Badge color="orange" leftSection={<IconAlertTriangle size={14} />}>שים לב</Badge>}
          </Group>
        </Group>
        <Button component={Link} to="/orders" variant="subtle" mt="sm">מעבר לרשימת ההזמנות</Button>
      </Card>)}</Stack> : <EmptyState>אין ייצור נדרש לתאריך זה</EmptyState>}
  </Stack>;
});
