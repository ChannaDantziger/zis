import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Group, Progress, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconChefHat } from '@tabler/icons-react';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import type { ProductionItem } from '../entities/admin.types.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';

export function ProductionPage() {
  const date = currentBusinessDate();
  const query = useQuery({ queryKey: ['production', date], queryFn: () => request<ProductionItem[]>(`/admin/production?date=${date}`) });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  return <Stack gap="lg" maw={900} mx="auto"><Group><IconChefHat size={28} color="var(--mantine-color-orange-6)" /><div><Text c="dimmed" size="sm">ייצור היום · {date}</Text><Title order={1}>מה צריך להכין</Title></div></Group>{query.data.length ? <Stack>{query.data.map((item) => <Card key={item.productVariantId} withBorder radius="lg"><Group justify="space-between"><div><Text fw={700}>{item.productName}</Text><Text c="dimmed">{item.variantName} · {item.orderCount} הזמנות</Text></div><Group><Text size="xl" fw={700}>{item.requiredSets}</Text><Text size="sm" c="dimmed">Sets</Text>{item.hasOpenTask && <Badge color="orange" leftSection={<IconAlertTriangle size={14} />}>שים לב</Badge>}</Group></Group><Progress value={100} color={item.hasOpenTask ? 'orange' : 'teal'} mt="md" aria-label={`נדרש ${item.requiredSets} Sets`} /></Card>)}</Stack> : <EmptyState>אין ייצור נדרש היום</EmptyState>}</Stack>;
}
