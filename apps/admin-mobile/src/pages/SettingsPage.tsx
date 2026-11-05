import { type ReactNode, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Alert, Button, Card, Checkbox, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Tabs, Text, TextInput, Title } from '@mantine/core';
import { request } from '../shared/api/http-client.js';
import type { AdminBusinessSettings, AdminCommerceSettings } from '../entities/admin.types.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';
import { ClosuresSettings } from '../features/settings/ClosuresSettings.js';
import { ShippingSettings } from '../features/settings/ShippingSettings.js';

type MutationInput = { path: string; method: 'PATCH' | 'POST'; body: unknown };
const days = [{ value: 'sunday', label: 'ראשון' }, { value: 'monday', label: 'שני' }, { value: 'tuesday', label: 'שלישי' }, { value: 'wednesday', label: 'רביעי' }, { value: 'thursday', label: 'חמישי' }, { value: 'friday', label: 'שישי' }, { value: 'saturday', label: 'שבת' }];

export function SettingsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['commerce-settings'], queryFn: () => request<AdminCommerceSettings>('/admin/commerce/settings') });
  const mutation = useMutation({ mutationFn: ({ path, method, body }: MutationInput) => request(path, { method, body: JSON.stringify(body) }), onSuccess: () => client.invalidateQueries({ queryKey: ['commerce-settings'] }) });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  return <Stack gap="lg" maw={1100} mx="auto">
    <Title order={1}>הגדרות החנות</Title>
    {mutation.isError && <Alert color="red" title="השמירה נכשלה">{mutation.error.message}</Alert>}
    {mutation.isSuccess && <Alert color="green">השינויים נשמרו.</Alert>}
    <Tabs defaultValue="business"><Tabs.List mb="lg">
      <Tabs.Tab value="business">החנות והזמנות</Tabs.Tab><Tabs.Tab value="shipping">משלוחים ומחירים</Tabs.Tab>
    </Tabs.List><Tabs.Panel value="business">
      <BusinessSettings value={query.data.business} onSave={(body) => mutation.mutate({ path: '/admin/commerce/settings', method: 'PATCH', body })} saving={mutation.isPending} closures={<ClosuresSettings closures={query.data.closures} onSave={(path, method, body) => mutation.mutateAsync({ path, method, body })} saving={mutation.isPending} />} />
    </Tabs.Panel><Tabs.Panel value="shipping">
      <ShippingSettings data={query.data} onSave={(path, method, body) => mutation.mutateAsync({ path, method, body })} saving={mutation.isPending} />

    </Tabs.Panel></Tabs>
  </Stack>;
}

function BusinessSettings({ value, onSave, saving, closures }: { closures: ReactNode; value: AdminBusinessSettings; onSave: (body: Partial<AdminBusinessSettings>) => void; saving: boolean }) {
  const [form, setForm] = useState(value);
  useEffect(() => setForm(value), [value]);
  const set = <K extends keyof AdminBusinessSettings>(key: K, next: AdminBusinessSettings[K]) => setForm((current) => ({ ...current, [key]: next }));
  return <Card withBorder radius="lg"><Stack><form id="business-settings-form" onSubmit={(event) => {
    event.preventDefault();
    if (!saving) onSave({ storeOpen: form.storeOpen, lockMode: form.lockMode, lockMessage: form.lockMessage, minimumProductSubtotal: form.minimumProductSubtotal, maxAdvanceDays: form.maxAdvanceDays, dispatchTime: form.dispatchTime, sameDayCutoffTime: form.sameDayCutoffTime, workingDays: form.workingDays });
  }}><Stack>
    <Title order={2}>החנות והזמנות</Title>
    <Text size="sm" c="dimmed">השינויים נכנסים לתוקף לאחר שמירה.</Text>
    <Switch label="קבלת הזמנות בחנות" disabled={saving} checked={form.storeOpen && form.lockMode === 'open'} onChange={(event) => {
      const open = event.currentTarget.checked;
      setForm((current) => ({ ...current, storeOpen: open, lockMode: open ? 'open' : 'closed' }));
    }} />
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput label="הודעה ללקוחות כשהחנות סגורה" disabled={saving} value={form.lockMessage ?? ''} onChange={(event) => set('lockMessage', event.currentTarget.value || null)} />
      <TextInput label="מינימום להזמנה (₪)" description="לפי סכום המוצרים, ללא דמי משלוח" required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" disabled={saving} value={form.minimumProductSubtotal} onChange={(event) => set('minimumProductSubtotal', event.currentTarget.value)} />
      <NumberInput label="כמה ימים קדימה אפשר להזמין?" min={0} allowDecimal={false} required disabled={saving} value={form.maxAdvanceDays} onChange={(value) => set('maxAdvanceDays', Number(value))} />
      <TextInput type="time" label="שעת יציאת המשלוחים" disabled={saving} value={form.dispatchTime ?? ''} onChange={(event) => set('dispatchTime', event.currentTarget.value || null)} />
      <TextInput type="time" label="עד איזו שעה אפשר להזמין להיום?" required disabled={saving} value={form.sameDayCutoffTime} onChange={(event) => set('sameDayCutoffTime', event.currentTarget.value)} />
    </SimpleGrid>
    <Checkbox.Group label="ימי חלוקה" value={form.workingDays} onChange={(next) => set('workingDays', next)}><Group mt="xs">{days.map((day) => <Checkbox key={day.value} value={day.value} label={day.label} disabled={saving} />)}</Group></Checkbox.Group>
    <Group><Button type="submit" loading={saving}>שמירת הגדרות החנות</Button></Group>
  </Stack></form>
    <Accordion variant="contained"><Accordion.Item value="advanced"><Accordion.Control>הגדרות מתקדמות</Accordion.Control><Accordion.Panel><Stack>
      <Select label="מצב נעילה" allowDeselect={false} disabled={saving} data={[{ value: 'open', label: 'פתוחה' }, { value: 'closed', label: 'סגורה' }, { value: 'scheduled', label: 'מתוזמנת' }]} value={form.lockMode} onChange={(value) => value && set('lockMode', value as AdminBusinessSettings['lockMode'])} />
      <Text size="sm" c="dimmed">אזור זמן: {form.businessTimezone}</Text>
      <Button type="submit" form="business-settings-form" disabled={saving}>שמירת הגדרות החנות</Button>
      {closures}
    </Stack></Accordion.Panel></Accordion.Item></Accordion>
  </Stack></Card>;
}
