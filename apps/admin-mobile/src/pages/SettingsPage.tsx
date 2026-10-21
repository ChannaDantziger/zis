import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Checkbox, Divider, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Text, TextInput, Textarea, Title } from '@mantine/core';
import { IconDeviceFloppy, IconPlus, IconSettings, IconTruck } from '@tabler/icons-react';
import { request } from '../shared/api/http-client.js';
import type { AdminBusinessSettings, AdminCommerceSettings, AdminShippingMethod, AdminShippingRule, AdminShippingZone, AdminStoreClosure } from '../entities/admin.types.js';
import { ErrorState, LoadingState } from '../shared/components/StateMessage.js';

type MutationInput = { path: string; method: 'PATCH' | 'POST'; body: unknown };
const days = [{ value: 'sunday', label: 'ראשון' }, { value: 'monday', label: 'שני' }, { value: 'tuesday', label: 'שלישי' }, { value: 'wednesday', label: 'רביעי' }, { value: 'thursday', label: 'חמישי' }, { value: 'friday', label: 'שישי' }, { value: 'saturday', label: 'שבת' }];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['commerce-settings'], queryFn: () => request<AdminCommerceSettings>('/admin/commerce/settings') });
  const mutation = useMutation({ mutationFn: ({ path, method, body }: MutationInput) => request(path, { method, body: JSON.stringify(body) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commerce-settings'] }) });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  return <Stack gap="lg" maw={1100} mx="auto">
    <Group><IconSettings size={30} color="var(--mantine-color-orange-6)" /><div><Text c="dimmed" size="sm">הגדרות מסחר ותפעול</Text><Title order={1}>משלוחים, זמינות והזמנות</Title></div></Group>
    {mutation.isError && <Alert color="red" title="השמירה נכשלה">{mutation.error.message}</Alert>}
    <BusinessSettings value={query.data.business} onSave={(body) => mutation.mutate({ path: '/admin/commerce/settings', method: 'PATCH', body })} saving={mutation.isPending} />
    <ShippingSettings data={query.data} onSave={(path, method, body) => mutation.mutate({ path, method, body })} saving={mutation.isPending} />
    <ClosuresSettings closures={query.data.closures} onSave={(path, method, body) => mutation.mutate({ path, method, body })} saving={mutation.isPending} />
  </Stack>;
}

function BusinessSettings({ value, onSave, saving }: { value: AdminBusinessSettings; onSave: (body: Partial<AdminBusinessSettings>) => void; saving: boolean }) {
  const [form, setForm] = useState(value);
  useEffect(() => setForm(value), [value]);
  const set = <K extends keyof AdminBusinessSettings>(key: K, next: AdminBusinessSettings[K]) => setForm((current) => ({ ...current, [key]: next }));
  return <Card withBorder radius="lg"><Group justify="space-between" mb="md"><Group><IconTruck size={22} /><Title order={2}>הגדרות חנות ומשלוח</Title></Group><Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} onClick={() => onSave(form)}>שמור</Button></Group>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Switch label="החנות פתוחה" checked={form.storeOpen} onChange={(event) => set('storeOpen', event.currentTarget.checked)} />
      <Select label="מצב נעילה" data={[{ value: 'open', label: 'פתוחה' }, { value: 'closed', label: 'סגורה' }, { value: 'scheduled', label: 'מתוזמנת' }]} value={form.lockMode} onChange={(value) => value && set('lockMode', value as AdminBusinessSettings['lockMode'])} />
      <TextInput label="הודעת נעילה" value={form.lockMessage ?? ''} onChange={(event) => set('lockMessage', event.currentTarget.value || null)} />
      <TextInput label="מינימום סכום מוצרים להזמנה (₪)" value={form.minimumProductSubtotal} onChange={(event) => set('minimumProductSubtotal', event.currentTarget.value)} />
      <Text size="sm" c="dimmed">המינימום נבדק לפי סכום המוצרים בלבד. דמי משלוח אינם נכללים בחישוב.</Text>
      <NumberInput label="כמה ימים קדימה ניתן להזמין" min={0} value={form.maxAdvanceDays} onChange={(value) => set('maxAdvanceDays', Number(value) || 0)} />
      <TextInput label="שעת יציאה מינימלית / יומית" placeholder="HH:mm" value={form.dispatchTime ?? ''} onChange={(event) => set('dispatchTime', event.currentTarget.value || null)} />
      <TextInput label="Cutoff להזמנה באותו יום" placeholder="HH:mm" value={form.sameDayCutoffTime} onChange={(event) => set('sameDayCutoffTime', event.currentTarget.value)} />
      <TextInput label="אזור זמן" value={form.businessTimezone} onChange={(event) => set('businessTimezone', event.currentTarget.value)} />
      <TextInput label="סטטוס הכנה לאחר תשלום" value={form.orderPreparationStatus} onChange={(event) => set('orderPreparationStatus', event.currentTarget.value)} />
    </SimpleGrid>
    <Checkbox.Group label="ימי חלוקה" value={form.workingDays} onChange={(next) => set('workingDays', next)} mt="md"><Group mt="xs">{days.map((day) => <Checkbox key={day.value} value={day.value} label={day.label} />)}</Group></Checkbox.Group>
  </Card>;
}

function ShippingSettings({ data, onSave, saving }: { data: AdminCommerceSettings; onSave: (path: string, method: 'PATCH' | 'POST', body: unknown) => void; saving: boolean }) {
  const [newZone, setNewZone] = useState({ name: '', city: '', neighborhood: '', dispatchTime: '', isActive: true });
  const [newRule, setNewRule] = useState<RuleForm>({ shippingZoneId: data.shippingZones[0]?.shippingZoneId ?? '', shippingMethodId: data.shippingMethods[0]?.shippingMethodId ?? '', basePrice: '0.00', sizeFromSets: 1, sizeToSets: '', sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', isActive: true });
  return <Card withBorder radius="lg"><Title order={2} mb="md">מחירי משלוח ואזורים</Title>
    <Stack gap="md"><Text fw={700}>אזורים</Text>{data.shippingZones.map((zone) => <ZoneRow key={zone.shippingZoneId} zone={zone} onSave={(body) => onSave(`/admin/shipping/zones/${zone.shippingZoneId}`, 'PATCH', body)} saving={saving} />)}
      <Card withBorder bg="gray.0"><Text fw={600} mb="xs">הוספת אזור</Text><SimpleGrid cols={{ base: 1, sm: 4 }}><TextInput placeholder="שם" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.currentTarget.value })} /><TextInput placeholder="עיר" value={newZone.city} onChange={(e) => setNewZone({ ...newZone, city: e.currentTarget.value })} /><TextInput placeholder="שכונה" value={newZone.neighborhood} onChange={(e) => setNewZone({ ...newZone, neighborhood: e.currentTarget.value })} /><TextInput placeholder="שעת יציאה" value={newZone.dispatchTime} onChange={(e) => setNewZone({ ...newZone, dispatchTime: e.currentTarget.value })} /></SimpleGrid><Button mt="sm" leftSection={<IconPlus size={16} />} onClick={() => onSave('/admin/shipping/zones', 'POST', { ...newZone, neighborhood: newZone.neighborhood || null, dispatchTime: newZone.dispatchTime || null })}>הוסף אזור</Button></Card>
      <Divider /><Text fw={700}>שיטות משלוח</Text>{data.shippingMethods.map((method) => <MethodRow key={method.shippingMethodId} method={method} onSave={(body) => onSave(`/admin/shipping/methods/${method.shippingMethodId}`, 'PATCH', body)} saving={saving} />)}
      <Divider /><Text fw={700}>כללי מחיר</Text>{data.shippingRules.map((rule) => <RuleRow key={rule.shippingRuleId} rule={rule} zones={data.shippingZones} methods={data.shippingMethods} onSave={(body) => onSave(`/admin/shipping/rules/${rule.shippingRuleId}`, 'PATCH', body)} saving={saving} />)}
      <Card withBorder bg="gray.0"><Text fw={600} mb="xs">הוספת כלל מחיר</Text><RuleFields value={newRule} zones={data.shippingZones} methods={data.shippingMethods} onChange={setNewRule} /><Button mt="sm" leftSection={<IconPlus size={16} />} onClick={() => onSave('/admin/shipping/rules', 'POST', { ...newRule, sizeToSets: newRule.sizeToSets ? Number(newRule.sizeToSets) : null })}>הוסף כלל</Button></Card>
    </Stack>
  </Card>;
}

function ZoneRow({ zone, onSave, saving }: { zone: AdminShippingZone; onSave: (body: Partial<AdminShippingZone>) => void; saving: boolean }) {
  const [form, setForm] = useState(zone); useEffect(() => setForm(zone), [zone]);
  return <Card withBorder><Group align="end"><TextInput label="שם" value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} /><TextInput label="עיר" value={form.city} onChange={(e) => setForm({ ...form, city: e.currentTarget.value })} /><TextInput label="שכונה" value={form.neighborhood ?? ''} onChange={(e) => setForm({ ...form, neighborhood: e.currentTarget.value || null })} /><TextInput label="שעת יציאה" value={form.dispatchTime ?? ''} onChange={(e) => setForm({ ...form, dispatchTime: e.currentTarget.value || null })} /><Switch label="פעיל" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.currentTarget.checked })} /><Button loading={saving} onClick={() => onSave(form)}>שמור</Button></Group></Card>;
}

function MethodRow({ method, onSave, saving }: { method: AdminShippingMethod; onSave: (body: Partial<AdminShippingMethod>) => void; saving: boolean }) {
  const [form, setForm] = useState(method); useEffect(() => setForm(method), [method]);
  return <Group align="end"><TextInput label={`${method.code} · שם שיטה`} value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} /><Switch label="פעיל" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.currentTarget.checked })} /><Button loading={saving} onClick={() => onSave(form)}>שמור</Button></Group>;
}

function RuleRow({ rule, zones, methods, onSave, saving }: { rule: AdminShippingRule; zones: AdminShippingZone[]; methods: AdminShippingMethod[]; onSave: (body: unknown) => void; saving: boolean }) {
  const [form, setForm] = useState<RuleForm>(rule); useEffect(() => setForm(rule), [rule]);
  return <Card withBorder><RuleFields value={form} zones={zones} methods={methods} onChange={setForm} /><Group justify="flex-end" mt="sm"><Button loading={saving} onClick={() => onSave(normalizeRule(form))}>שמור כלל</Button></Group></Card>;
}

type RuleForm = { shippingZoneId: string; shippingMethodId: string; basePrice: string; sizeFromSets: number; sizeToSets: number | string | null; sizeSurcharge: string; timeSurcharge: string; urgencySurcharge: string; isActive: boolean };
function RuleFields({ value, zones, methods, onChange }: { value: RuleForm; zones: AdminShippingZone[]; methods: AdminShippingMethod[]; onChange: (value: RuleForm) => void }) {
  const update = <K extends keyof RuleForm>(key: K, next: RuleForm[K]) => onChange({ ...value, [key]: next });
  return <SimpleGrid cols={{ base: 1, sm: 3 }}><Select label="אזור" data={zones.map((z) => ({ value: z.shippingZoneId, label: `${z.city}${z.neighborhood ? ` · ${z.neighborhood}` : ''}` }))} value={value.shippingZoneId} onChange={(next) => next && update('shippingZoneId', next)} /><Select label="שיטת משלוח" data={methods.map((m) => ({ value: m.shippingMethodId, label: m.name }))} value={value.shippingMethodId} onChange={(next) => next && update('shippingMethodId', next)} /><TextInput label="מחיר בסיס (₪)" value={value.basePrice} onChange={(e) => update('basePrice', e.currentTarget.value)} /><NumberInput label="מ־Sets" min={1} value={value.sizeFromSets} onChange={(next) => update('sizeFromSets', Number(next) || 1)} /><TextInput label="עד Sets (ריק = ללא הגבלה)" value={value.sizeToSets === null ? '' : String(value.sizeToSets)} onChange={(e) => update('sizeToSets', e.currentTarget.value)} /><TextInput label="תוספת גודל (₪)" value={value.sizeSurcharge} onChange={(e) => update('sizeSurcharge', e.currentTarget.value)} /><TextInput label="תוספת זמן (₪)" value={value.timeSurcharge} onChange={(e) => update('timeSurcharge', e.currentTarget.value)} /><TextInput label="תוספת דחיפות (₪)" value={value.urgencySurcharge} onChange={(e) => update('urgencySurcharge', e.currentTarget.value)} /><Switch label="פעיל" checked={value.isActive} onChange={(e) => update('isActive', e.currentTarget.checked)} /></SimpleGrid>;
}

function normalizeRule(value: RuleForm): RuleForm {
  return { ...value, sizeToSets: value.sizeToSets === '' || value.sizeToSets === null ? null : Number(value.sizeToSets) };
}

function ClosuresSettings({ closures, onSave, saving }: { closures: AdminStoreClosure[]; onSave: (path: string, method: 'PATCH' | 'POST', body: unknown) => void; saving: boolean }) {
  const [form, setForm] = useState({ startsAt: '', endsAt: '', reason: '', isActive: true });
  return <Card withBorder radius="lg"><Title order={2} mb="md">סגירות ותאריכים חסומים</Title><Stack>{closures.map((closure) => <Group key={closure.storeClosureId} align="end"><TextInput type="datetime-local" label="מתאריך" value={toLocalInput(closure.startsAt)} onChange={(e) => onSave(`/admin/store-closures/${closure.storeClosureId}`, 'PATCH', { startsAt: new Date(e.currentTarget.value).toISOString() })} /><TextInput type="datetime-local" label="עד תאריך" value={toLocalInput(closure.endsAt)} onChange={(e) => onSave(`/admin/store-closures/${closure.storeClosureId}`, 'PATCH', { endsAt: new Date(e.currentTarget.value).toISOString() })} /><TextInput label="סיבה" defaultValue={closure.reason ?? ''} onBlur={(e) => onSave(`/admin/store-closures/${closure.storeClosureId}`, 'PATCH', { reason: e.currentTarget.value || null })} /><Switch label="פעיל" checked={closure.isActive} onChange={(e) => onSave(`/admin/store-closures/${closure.storeClosureId}`, 'PATCH', { isActive: e.currentTarget.checked })} /></Group>)}<Divider /><Text fw={600}>הוספת סגירה</Text><SimpleGrid cols={{ base: 1, sm: 4 }}><TextInput type="datetime-local" label="מתאריך" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.currentTarget.value })} /><TextInput type="datetime-local" label="עד תאריך" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.currentTarget.value })} /><TextInput label="סיבה" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.currentTarget.value })} /><Switch label="פעיל" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.currentTarget.checked })} /></SimpleGrid><Button loading={saving} leftSection={<IconPlus size={16} />} onClick={() => onSave('/admin/store-closures', 'POST', { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), reason: form.reason || null })}>הוסף סגירה</Button></Stack></Card>;
}

function toLocalInput(value: string): string { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const pad = (n: number) => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
