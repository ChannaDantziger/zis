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
      query.data.length ? <Stack>{query.data.map((item) => <Card key={item.productVariantId} withBorder radius="lg">
        <Group justify="space-between">
          <div><Text fw={700}>{item.productName}</Text><Text c="dimmed">{item.variantName} · {item.orderCount} הזמנות</Text></div>
          <Group><Text size="xl" fw={700}>{item.requiredSets}</Text><Text size="sm" c="dimmed">Sets להכנה</Text>
            {item.hasOpenTask && <Badge color="orange" leftSection={<IconAlertTriangle size={14} />}>שים לב</Badge>}
          </Group>
        </Group>
        <Button component={Link} to="/orders" variant="subtle" mt="sm"
          onClick={() => adminUiStore.showProductionOrders(date, item.productVariantId)}>
          הצג הזמנות לווריאציה בתאריך זה
        </Button>
        <Text size="xs" c="dimmed">הרשימה תציג את כל שלבי ההזמנות התואמות, כולל הזמנות שכבר הוכנו.</Text>
      </Card>)}</Stack> : <EmptyState>אין ייצור נדרש לתאריך זה</EmptyState>}
  </Stack>;
});
