import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Stack, TextInput, Title } from '@mantine/core';
import { createManualTask, refreshTaskQueries } from '../api/tasks-api.js';
import { adminUiStore } from '../../stores/admin-ui.store.js';

const MAX_TITLE_LENGTH = 200;

export function ManualTaskForm() {
  const [title, setTitle] = useState('');
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: createManualTask,
    onSuccess: () => { setTitle(''); adminUiStore.setTaskStatus('open'); },
    onSettled: () => refreshTaskQueries(client),
  });
  return <Card component="form" withBorder radius="lg" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending && title.trim()) mutation.mutate(title.trim()); }}>
    <Stack><Title order={3}>משימה ידנית חדשה</Title>
      <TextInput label="כותרת המשימה" required maxLength={MAX_TITLE_LENGTH} value={title} disabled={mutation.isPending} onChange={(event) => { setTitle(event.currentTarget.value); mutation.reset(); }} />
      <Button type="submit" loading={mutation.isPending} disabled={!title.trim()}>הוסף משימה</Button>
      {mutation.isSuccess && <Alert color="teal">המשימה נוספה לרשימת המשימות הפתוחות.</Alert>}
      {mutation.isError && <Alert color="red" title="השמירה נכשלה">{mutation.error.message} · בדקי ברשימה אם המשימה נוספה לפני ניסיון נוסף.</Alert>}
    </Stack>
  </Card>;
}
