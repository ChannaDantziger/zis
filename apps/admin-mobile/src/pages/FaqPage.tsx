import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Group, NumberInput, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { request } from '../shared/api/http-client.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';

type FaqEntry = { faqEntryId: string; question: string; answer: string; status: 'draft' | 'published' | 'archived'; sortOrder: number };
const EMPTY: FaqEntry = { faqEntryId: '', question: '', answer: '', status: 'draft', sortOrder: 0 };
const STATUSES = [{ value: 'draft', label: 'טיוטה' }, { value: 'published', label: 'מפורסמת' }, { value: 'archived', label: 'ארכיון' }];

export function FaqPage() {
  const client = useQueryClient();
  const [draft, setDraft] = useState<FaqEntry | null>(null);
  const query = useQuery({ queryKey: ['admin-faq'], queryFn: ({ signal }) => request<{ items: FaqEntry[] }>('/admin/faq', { signal }) });
  const mutation = useMutation({
    mutationFn: (entry: FaqEntry) => request(entry.faqEntryId ? `/admin/faq/${encodeURIComponent(entry.faqEntryId)}` : '/admin/faq', {
      method: entry.faqEntryId ? 'PATCH' : 'POST', body: JSON.stringify({ question: entry.question.trim(), answer: entry.answer.trim(), status: entry.status, sortOrder: entry.sortOrder }),
    }),
    onSuccess: async () => { setDraft(null); await client.invalidateQueries({ queryKey: ['admin-faq'] }); },
  });
  const edit = (entry: FaqEntry) => { mutation.reset(); setDraft({ ...entry }); };
  return <Stack maw={900} mx="auto">
    <Group justify="space-between"><Title order={1}>שאלות ותשובות</Title><Button disabled={mutation.isPending} onClick={() => edit({ ...EMPTY, sortOrder: (query.data?.items.length ?? 0) * 10 })}>הוספת שאלה</Button></Group>
    <Text c="dimmed">רק שאלות במצב מפורסמת מוצגות בחנות, לפי סדר התצוגה.</Text>
    {mutation.isError && <Alert color="red" title="השמירה נכשלה">{mutation.error.message}</Alert>}
    {mutation.isSuccess && <Alert color="green">השאלה נשמרה.</Alert>}
    {draft && <Card withBorder component="form" onSubmit={(event) => { event.preventDefault(); if (draft.question.trim() && draft.answer.trim() && !mutation.isPending) mutation.mutate(draft); }}><Stack>
      <Title order={2}>{draft.faqEntryId ? 'עריכת שאלה' : 'שאלה חדשה'}</Title>
      <TextInput required maxLength={500} label="שאלה" disabled={mutation.isPending} value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.currentTarget.value })} />
      <Textarea required autosize minRows={3} maxLength={10000} label="תשובה" disabled={mutation.isPending} value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.currentTarget.value })} />
      <Group grow><Select label="פרסום" allowDeselect={false} disabled={mutation.isPending} data={STATUSES} value={draft.status} onChange={(status) => status && setDraft({ ...draft, status: status as FaqEntry['status'] })} />
        <NumberInput label="סדר תצוגה" min={0} allowDecimal={false} required disabled={mutation.isPending} value={draft.sortOrder} onChange={(value) => setDraft({ ...draft, sortOrder: Number(value) })} /></Group>
      <Group><Button type="submit" loading={mutation.isPending}>שמירת שאלה</Button><Button variant="subtle" disabled={mutation.isPending} onClick={() => setDraft(null)}>ביטול</Button></Group>
    </Stack></Card>}
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={query.error.message} /> : <>
      {!query.data.items.length && <Text>עדיין אין שאלות ותשובות.</Text>}
      {query.data.items.map((entry) => <Card key={entry.faqEntryId} withBorder><Stack gap="xs">
        <Group justify="space-between"><Title order={2} size="h4">{entry.question}</Title><Badge>{STATUSES.find((status) => status.value === entry.status)?.label}</Badge></Group>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{entry.answer}</Text><Text size="sm" c="dimmed">סדר תצוגה: {entry.sortOrder}</Text>
        <Button variant="light" disabled={mutation.isPending} onClick={() => edit(entry)}>עריכה / שינוי פרסום</Button>
      </Stack></Card>)}
    </>}
  </Stack>;
}
