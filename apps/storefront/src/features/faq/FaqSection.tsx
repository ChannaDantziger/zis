import { Accordion, Alert, Button, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../shared/api/http-client';

interface FaqEntry { faqEntryId: string; question: string; answer: string; sortOrder: number }

export function FaqSection() {
  const result = useQuery({ queryKey: ['faq'], queryFn: () => apiRequest<{ items: FaqEntry[] }>('/faq') });
  return <Stack component="section" id="faq" className="faq-section" py="xl" aria-labelledby="faq-title">
    <Title order={2} id="faq-title" className="faq-title" tabIndex={-1}>שאלות ותשובות</Title>
    {result.isPending && <Skeleton h={100} aria-label="טוען שאלות ותשובות" />}
    {result.isError && <Alert color="orange">לא ניתן לטעון שאלות ותשובות.
      <Button variant="subtle" onClick={() => void result.refetch()}>ניסיון נוסף</Button></Alert>}
    {result.data && (result.data.items.length ? <Accordion>{result.data.items.map((entry) =>
      <Accordion.Item key={entry.faqEntryId} value={entry.faqEntryId}>
        <Accordion.Control><Text fw={700}>{entry.question}</Text></Accordion.Control>
        <Accordion.Panel><Text style={{ whiteSpace: 'pre-line' }}>{entry.answer}</Text></Accordion.Panel>
      </Accordion.Item>)}</Accordion> : <Text c="dimmed">שאלות ותשובות יופיעו לאחר פרסומן.</Text>)}
  </Stack>;
}
