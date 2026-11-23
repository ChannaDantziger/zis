import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Group, Modal, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconClock, IconCircleCheck } from '@tabler/icons-react';
import { changeHomeTask, createHomeTask } from './home-data.js';
import type { HomeTask, TaskStage } from './home.types.js';

const STAGES: Array<{ value: TaskStage; label: string }> = [
  { value: 'open', label: 'פתוח' }, { value: 'in_progress', label: 'בטיפול' }, { value: 'closed', label: 'סגור' },
];
const labels = Object.fromEntries(STAGES.map(item => [item.value, item.label])) as Record<TaskStage, string>;
const icons = { open: IconAlertCircle, in_progress: IconClock, closed: IconCircleCheck };

export function HomeTasks({ tasks, error }: { tasks: HomeTask[]; error?: string }) {
  const client = useQueryClient();
  const [title, setTitle] = useState(''), [description, setDescription] = useState('');
  const [initial, setInitial] = useState<TaskStage>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [next, setNext] = useState<TaskStage>('open'), [note, setNote] = useState('');
  const selected = tasks.find(task => task.taskId === selectedId);
  const refresh = () => Promise.all(['home-tasks', 'dashboard', 'tasks'].map(key => client.invalidateQueries({ queryKey: [key] })));
  const create = useMutation({ mutationFn: () => createHomeTask(title.trim(), description.trim(), initial),
    onSuccess: async () => { setTitle(''); setDescription(''); setInitial('open'); await refresh(); } });
  const update = useMutation({ mutationFn: () => changeHomeTask(selected!, next, note.trim()),
    onSuccess: async () => { setNote(''); await refresh(); } });
  return <Card withBorder radius="lg" className="home-panel" id="home-tasks">
    <Group justify="space-between" mb="md"><div><Title order={2}>דורש טיפול · משימות</Title><Text size="sm" c="dimmed">לרשום, להעביר שלב ולקרוא את כל ההערות</Text></div><Text fw={700}>{tasks.filter(task => task.status !== 'closed').length} פעילות</Text></Group>
    {error && <Alert color="red" mb="md" title="לא ניתן לטעון משימות">{error}</Alert>}
    <form onSubmit={event => { event.preventDefault(); if (title.trim()) create.mutate(); }}>
      <SimpleGrid cols={{ base: 1, sm: 3 }}><TextInput label="מה צריך לעשות?" required maxLength={200} value={title} onChange={event => setTitle(event.currentTarget.value)} />
        <Textarea label="פרטים נוספים" maxLength={5000} value={description} onChange={event => setDescription(event.currentTarget.value)} />
        <Select label="מצב התחלתי" value={initial} data={STAGES} onChange={value => setInitial(value as TaskStage)} /></SimpleGrid>
      <Button type="submit" mt="sm" loading={create.isPending} disabled={!title.trim() || Boolean(error)}>הוספת משימה</Button>
    </form>
    {create.isError && <Alert color="red" mt="sm">{create.error.message}</Alert>}
    <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xl" spacing="sm">{STAGES.map(stage => <div className="home-task-column" data-task-stage={stage.value} key={stage.value}>
      <Group gap="xs"><TaskIcon status={stage.value} /><Title order={3}>{stage.label} · {tasks.filter(task => task.status === stage.value).length}</Title></Group>
      {tasks.filter(task => task.status === stage.value).map(task => <button type="button" key={task.taskId} className="home-task-card" onClick={() => { setSelectedId(task.taskId); setNext(task.status); setNote(''); update.reset(); }}>
        <b>{task.title}</b><small>{labels[task.status]} · {task.source === 'system' ? 'משימת מערכת' : 'משימה ידנית'} · {task.history.length} רישומים</small>
        {task.description && <span>{task.description}</span>}
      </button>)}
      {!tasks.some(task => task.status === stage.value) && <Text size="sm" c="dimmed">אין משימות במצב זה</Text>}
    </div>)}</SimpleGrid>
    <Modal opened={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.title ?? 'פרטי משימה'} size="lg">
      {selected && <Stack><Text size="sm">{selected.source === 'system' ? 'משימת מערכת' : 'משימה ידנית'} · מצב נוכחי: {labels[selected.status]}</Text>
        <Title order={3}>כל מה שנכתב</Title><ol className="home-task-history">{selected.history.map((entry, index) => <li key={`${entry.createdAt}-${index}`}><b>{labels[entry.status]}</b> · {new Date(entry.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}<Text>{entry.note || 'ללא הערה'}</Text></li>)}</ol>
        <Select label="מצב חדש" value={next} data={STAGES} onChange={value => setNext(value as TaskStage)} />
        <Textarea label="הערה למעבר או למצב הנוכחי" value={note} maxLength={5000} onChange={event => setNote(event.currentTarget.value)} />
        <Button loading={update.isPending} disabled={next === selected.status && !note.trim()} onClick={() => update.mutate()}>שמירת מצב והערה</Button>
        {update.isError && <Alert color="red">{update.error.message}</Alert>}
      </Stack>}
    </Modal>
  </Card>;
}

function TaskIcon({ status }: { status: TaskStage }) {
  const Icon = icons[status];
  return <Icon size={20} aria-label={labels[status]} />;
}
