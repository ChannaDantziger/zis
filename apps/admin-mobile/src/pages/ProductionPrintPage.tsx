import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowRight, IconPrinter, IconRefresh } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Dashboard } from '../entities/admin.types.js';
import { currentBusinessDate, request } from '../shared/api/http-client.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { isBusinessDate } from '../shared/api/business-date.js';
import './production-print.css';

export function ProductionPrintPage() {
  const [params] = useSearchParams();
  const date = params.get('date') ?? currentBusinessDate();
  const validDate = isBusinessDate(date);
  const query = useQuery({
    enabled: validDate,
    queryKey: ['production-report', date],
    queryFn: ({ signal }) => request<Dashboard>(`/admin/dashboard?${new URLSearchParams({ date })}`, { signal }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `ZIS-production-${date}`;
    return () => { document.title = previousTitle; };
  }, [date]);
  const report = query.data;
  const generatedAt = query.dataUpdatedAt ? new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(query.dataUpdatedAt)) : '';
  const canPrint = validDate && query.isSuccess && !query.isFetching;
  return <Stack className="production-print-page" gap="lg" maw={1000} mx="auto">
    <Group className="production-print-controls" justify="space-between">
      <Button component={Link} to="/production" variant="subtle" leftSection={<IconArrowRight size={16} />}>חזרה לייצור</Button>
      <Group>
        <Button variant="default" disabled={!validDate} loading={query.isFetching} leftSection={<IconRefresh size={16} />} onClick={() => query.refetch()}>רענון רשימה</Button>
        <Button disabled={!canPrint} leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>הדפסה / שמירה כ־PDF</Button>
      </Group>
    </Group>
    <Text className="production-print-controls" size="sm" c="dimmed">לשמירת קובץ, בחרי שמירה כ־PDF בחלון ההדפסה. הרשימה משקפת את זמן השליפה המוצג; רענני לפני הדפסה נוספת.</Text>
    {!validDate ? <ErrorState message="תאריך הדוח אינו תקין. חזרי למסך הייצור ובחרי תאריך." /> : query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : report &&
      <Paper className="production-print-sheet" withBorder p="lg" radius="md">
        <Stack gap="md">
          <div><Text fw={700} size="xl">ZIS</Text><Title order={1}>רשימת ייצור · {report.date}</Title></div>
          <Text size="sm">נשלף: {generatedAt} · שעון ישראל</Text>
          <Group gap="xl">
            <Text>הזמנות פעילות ליום: {report.todayOrderCount}</Text>
            <Text>וריאציות להכנה: {report.production.length}</Text>
            <Text>סך Sets להכנה: {report.production.reduce((total, item) => total + item.requiredSets, 0)}</Text>
          </Group>
          <Text size="sm" c="dimmed">סך ההזמנות כולל את כל ההזמנות הפעילות ליום. הרשימה מטה כוללת רק פריטים שנדרשים להכנה לפי המצב הנוכחי.</Text>
          {report.production.length ? <Table.ScrollContainer minWidth={600} className="production-print-table">
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead><Table.Tr><Table.Th>מוצר</Table.Th><Table.Th>וריאציה</Table.Th><Table.Th>Sets להכנה</Table.Th><Table.Th>הזמנות לווריאציה</Table.Th><Table.Th>דורש טיפול</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>{report.production.map((item) => <Table.Tr key={item.productVariantId}>
                <Table.Td>{item.productName}</Table.Td><Table.Td>{item.variantName}</Table.Td>
                <Table.Td>{item.requiredSets}</Table.Td><Table.Td>{item.orderCount}</Table.Td>
                <Table.Td>{item.hasOpenTask ? 'משימה פתוחה' : '—'}</Table.Td>
              </Table.Tr>)}</Table.Tbody>
            </Table>
          </Table.ScrollContainer> : <Text fw={600}>אין ייצור נדרש לתאריך זה.</Text>}
          <Text size="xs" c="dimmed">הזמנה עם כמה וריאציות נספרת בכל שורה מתאימה; אין לחבר את ספירות ההזמנות בשורות.</Text>
        </Stack>
      </Paper>}
  </Stack>;
}
