import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Group, Pagination, Select, Stack, Text, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { listTasks, refreshTaskQueries, resolveManualTask } from '../shared/api/tasks-api.js';
import { ManualTaskForm } from '../shared/components/ManualTaskForm.js';
import { EmptyState, ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { adminUiStore } from '../stores/admin-ui.store.js';
import type { AdminTask, TaskStatus } from '../entities/admin.types.js';

const statusOptions = [{ value: 'open', label: 'פתוחות' }, { value: 'done', label: 'בוצעו' }, { value: 'dismissed', label: 'בוטלו' }];
const priorityLabels = { normal: 'רגילה', high: 'גבוהה', critical: 'דחופה' };

export const TasksPage = observer(function TasksPage() {
  const client = useQueryClient();
  const { taskStatus: status, taskPage: page } = adminUiStore;
  const query = useQuery({ queryKey: ['tasks', status, page], queryFn: ({ signal }) => listTasks(status, page, signal), gcTime: 0 });
  const mutation = useMutation({
    mutationFn: ({ task, target }: { task: AdminTask; target: Exclude<TaskStatus, 'open'> }) => resolveManualTask(task, target),
    onSettled: () => refreshTaskQueries(client),
  });
  const totalPages = query.data?.page.totalPages;
  useEffect(() => { if (totalPages !== undefined && page > Math.max(1, totalPages)) adminUiStore.setTaskPage(Math.max(1, totalPages)); }, [page, totalPages]);
  return <Stack gap="lg" maw={900} mx="auto">
    <Group justify="space-between"><Title order={1}>משימות תפעול</Title><Button variant="subtle" disabled={mutation.isPending} onClick={() => query.refetch()}>רענון</Button></Group>
    <ManualTaskForm />
    <Select label="מצב משימות" data={statusOptions} value={status} disabled={mutation.isPending} onChange={(value) => { if (value) { adminUiStore.setTaskStatus(value as TaskStatus); mutation.reset(); } }} />
    {mutation.isSuccess && <Alert color="teal">מצב המשימה נשמר.</Alert>}
    {mutation.isError && <Alert color="red" title="לא ניתן לסגור את המשימה">{mutation.error.message}</Alert>}
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : <>
      <Text>{query.data.page.totalItems} משימות במסנן זה</Text>
      {!query.data.data.length ? <EmptyState>אין משימות במסנן זה</EmptyState> : query.data.data.map((task) => <Card key={task.taskId} withBorder radius="lg"><Stack gap="sm">
        <Group justify="space-between"><Text fw={700}>{task.title}</Text><Group gap="xs"><Badge variant="light">{task.source === 'manual' ? 'ידנית' : 'מערכת'}</Badge><Badge color={task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'orange' : 'gray'}>{priorityLabels[task.priority]}</Badge></Group></Group>
        {task.description && <Text style={{ whiteSpace: 'pre-wrap' }}>{task.description}</Text>}
        <Text size="sm" c="dimmed">נוצרה: {new Date(task.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</Text>
        {task.resolvedAt && <Text size="sm" c="dimmed">נסגרה: {new Date(task.resolvedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</Text>}
        <Group>{task.orderId && <Button component={Link} to={`/orders/${task.orderId}`} variant="light">פתח הזמנה לטיפול</Button>}
          {task.source === 'manual' && task.status === 'open' && <><Button disabled={mutation.isPending} onClick={() => mutation.mutate({ task, target: 'done' })}>בוצע</Button><Button variant="subtle" color="gray" disabled={mutation.isPending} onClick={() => mutation.mutate({ task, target: 'dismissed' })}>בטל משימה</Button></>}
        </Group>
        {task.source === 'system' && task.status === 'open' && <Text size="sm" c="dimmed">משימת מערכת נסגרת דרך הטיפול באירוע שיצר אותה.</Text>}
      </Stack></Card>)}
      {query.data.page.totalPages > 1 && <Pagination total={query.data.page.totalPages} value={page} disabled={mutation.isPending} onChange={(value) => { adminUiStore.setTaskPage(value); mutation.reset(); }} aria-label="עמודי משימות" />}
    </>}
  </Stack>;
});
