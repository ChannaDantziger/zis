import { useEffect, useState } from 'react';
import { Accordion, Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import type { AdminStoreClosure } from '../../entities/admin.types.js';

type SaveClosure = (path: string, method: 'PATCH' | 'POST', body: unknown) => Promise<unknown>;
type ClosureDraft = { startsAt: string; endsAt: string; reason: string; isActive: boolean };
const EMPTY_CLOSURE: ClosureDraft = { startsAt: '', endsAt: '', reason: '', isActive: true };

export function ClosuresSettings({ closures, onSave, saving }: { closures: AdminStoreClosure[]; onSave: SaveClosure; saving: boolean }) {
  return <Card withBorder radius="lg"><Stack>
    <Title order={2}>תאריכים חסומים</Title>
    <Text size="sm" c="dimmed">הגדירי מתי אי אפשר לקבל הזמנות. כל שינוי נשמר רק בלחיצה על שמירה.</Text>
    {!closures.length && <Text>אין כרגע תאריכים חסומים.</Text>}
    <Accordion variant="separated">
      {closures.map((closure) => <Accordion.Item key={closure.storeClosureId} value={closure.storeClosureId}>
        <Accordion.Control><Group><Text>{closure.reason || 'סגירה מתוזמנת'}</Text><Badge color={closure.isActive ? 'orange' : 'gray'}>{closure.isActive ? 'פעילה' : 'לא פעילה'}</Badge></Group>
          <Text size="sm" c="dimmed">{new Date(closure.startsAt).toLocaleString('he-IL')} — {new Date(closure.endsAt).toLocaleString('he-IL')}</Text>
        </Accordion.Control>
        <Accordion.Panel><ClosureForm closure={closure} onSave={onSave} saving={saving} /></Accordion.Panel>
      </Accordion.Item>)}
      <Accordion.Item value="new"><Accordion.Control>הוספת תאריך חסום</Accordion.Control>
        <Accordion.Panel><ClosureForm onSave={onSave} saving={saving} /></Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  </Stack></Card>;
}

function ClosureForm({ closure, onSave, saving }: { closure?: AdminStoreClosure; onSave: SaveClosure; saving: boolean }) {
  const [form, setForm] = useState<ClosureDraft>(() => draft(closure));
  useEffect(() => setForm(draft(closure)), [closure]);
  const startsAt = new Date(form.startsAt), endsAt = new Date(form.endsAt);
  const valid = Number.isFinite(startsAt.getTime()) && Number.isFinite(endsAt.getTime()) && endsAt > startsAt;
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (valid && !saving) void onSave(closure ? `/admin/store-closures/${closure.storeClosureId}` : '/admin/store-closures', closure ? 'PATCH' : 'POST', {
      startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: form.reason.trim() || null, isActive: form.isActive,
    }).then(() => { if (!closure) setForm({ ...EMPTY_CLOSURE }); }).catch(() => {});
  }}><Stack>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput type="datetime-local" label="מתאריך ושעה" required disabled={saving} value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.currentTarget.value })} />
      <TextInput type="datetime-local" label="עד תאריך ושעה" required disabled={saving} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.currentTarget.value })} />
    </SimpleGrid>
    <TextInput label="סיבה לסגירה" disabled={saving} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.currentTarget.value })} />
    <Switch label="התאריך חסום להזמנות" disabled={saving} checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.currentTarget.checked })} />
    {form.startsAt && form.endsAt && !valid && <Alert color="red">תאריך הסיום צריך להיות אחרי תאריך ההתחלה.</Alert>}
    <Group><Button type="submit" loading={saving} disabled={!valid}>{closure ? 'שמירת השינוי' : 'הוספת תאריך חסום'}</Button></Group>
  </Stack></form>;
}

function draft(closure?: AdminStoreClosure): ClosureDraft {
  return closure ? { startsAt: localInput(closure.startsAt), endsAt: localInput(closure.endsAt), reason: closure.reason ?? '', isActive: closure.isActive } : { ...EMPTY_CLOSURE };
}
function localInput(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
