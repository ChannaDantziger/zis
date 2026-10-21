import { useEffect, useState } from 'react';
import { Accordion, Button, Card, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import type { AdminCommerceSettings, AdminShippingMethod, AdminShippingRule, AdminShippingZone } from '../../entities/admin.types.js';

type SaveShipping = (path: string, method: 'PATCH' | 'POST', body: unknown) => Promise<unknown>;
type ZoneForm = { name: string; city: string; neighborhood: string | null; dispatchTime: string | null; isActive: boolean };
type RuleForm = Omit<AdminShippingRule, 'shippingRuleId' | 'sizeToSets'> & { sizeToSets: string | number | null };
const EMPTY_ZONE: ZoneForm = { name: '', city: '', neighborhood: null, dispatchTime: null, isActive: true };
const MONEY_PATTERN = '[0-9]+(\\.[0-9]{1,2})?';

export function ShippingSettings({ data, onSave, saving }: { data: AdminCommerceSettings; onSave: SaveShipping; saving: boolean }) {
  return <Stack>
    <Title order={2}>משלוחים ומחירים</Title>
    <Text size="sm" c="dimmed">בחרי אזור או מחיר כדי לערוך אותו.</Text>
    <Accordion variant="separated" defaultValue="prices">
      <Accordion.Item value="prices"><Accordion.Control>מחירי משלוח · {data.shippingRules.length}</Accordion.Control><Accordion.Panel>
        <Accordion variant="contained">
          {data.shippingRules.map((rule) => <Accordion.Item value={rule.shippingRuleId} key={rule.shippingRuleId}>
            <Accordion.Control>{data.shippingZones.find((zone) => zone.shippingZoneId === rule.shippingZoneId)?.name ?? 'אזור משלוח'} · {data.shippingMethods.find((method) => method.shippingMethodId === rule.shippingMethodId)?.name} · בסיס ₪{rule.basePrice}{!rule.isActive && ' · לא פעיל'}</Accordion.Control>
            <Accordion.Panel><PriceEditor rule={rule} data={data} onSave={onSave} saving={saving} /></Accordion.Panel>
          </Accordion.Item>)}
          <Accordion.Item value="new"><Accordion.Control>הוספת מחיר משלוח</Accordion.Control><Accordion.Panel>
            <PriceEditor data={data} onSave={onSave} saving={saving} />
          </Accordion.Panel></Accordion.Item>
        </Accordion>
      </Accordion.Panel></Accordion.Item>
      <Accordion.Item value="zones"><Accordion.Control>אזורי משלוח · {data.shippingZones.length}</Accordion.Control><Accordion.Panel>
        <Accordion variant="contained">
          {data.shippingZones.map((zone) => <Accordion.Item value={zone.shippingZoneId} key={zone.shippingZoneId}>
            <Accordion.Control>{zone.name} · {zone.city}{!zone.isActive && ' · לא פעיל'}</Accordion.Control>
            <Accordion.Panel><ZoneEditor zone={zone} onSave={onSave} saving={saving} /></Accordion.Panel>
          </Accordion.Item>)}
          <Accordion.Item value="new"><Accordion.Control>הוספת אזור משלוח</Accordion.Control><Accordion.Panel><ZoneEditor onSave={onSave} saving={saving} /></Accordion.Panel></Accordion.Item>
        </Accordion>
      </Accordion.Panel></Accordion.Item>
      <Accordion.Item value="methods"><Accordion.Control>שיטות משלוח — הגדרות מתקדמות</Accordion.Control><Accordion.Panel>
        <Stack>{data.shippingMethods.map((method) => <MethodEditor key={method.shippingMethodId} method={method} onSave={onSave} saving={saving} />)}</Stack>
      </Accordion.Panel></Accordion.Item>
    </Accordion>
  </Stack>;
}

function ZoneEditor({ zone, onSave, saving }: { zone?: AdminShippingZone; onSave: SaveShipping; saving: boolean }) {
  const [form, setForm] = useState<ZoneForm>(zone ?? { ...EMPTY_ZONE });
  useEffect(() => { if (zone) setForm(zone); }, [zone]);
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!saving) void onSave(zone ? `/admin/shipping/zones/${zone.shippingZoneId}` : '/admin/shipping/zones', zone ? 'PATCH' : 'POST', form)
      .then(() => { if (!zone) setForm({ ...EMPTY_ZONE }); }).catch(() => {});
  }}><Stack>
    <TextInput label="שם האזור" required disabled={saving} value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} />
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput label="עיר" required disabled={saving} value={form.city} onChange={(event) => setForm({ ...form, city: event.currentTarget.value })} />
      <TextInput label="שכונה (לא חובה)" disabled={saving} value={form.neighborhood ?? ''} onChange={(event) => setForm({ ...form, neighborhood: event.currentTarget.value || null })} />
    </SimpleGrid>
    <Accordion variant="contained"><Accordion.Item value="advanced"><Accordion.Control>הגדרות מתקדמות</Accordion.Control><Accordion.Panel><Stack>
      <TextInput type="time" label="שעת יציאה מיוחדת לאזור" description="ריק — שימוש בשעת היציאה של החנות" disabled={saving} value={form.dispatchTime ?? ''} onChange={(event) => setForm({ ...form, dispatchTime: event.currentTarget.value || null })} />
      <Switch label="האזור זמין למשלוח" disabled={saving} checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.currentTarget.checked })} />
    </Stack></Accordion.Panel></Accordion.Item></Accordion>
    <Group><Button type="submit" loading={saving} disabled={!form.name.trim() || !form.city.trim()}>{zone ? 'שמירת האזור' : 'הוספת אזור'}</Button></Group>
  </Stack></form>;
}

function PriceEditor({ rule, data, onSave, saving }: { rule?: AdminShippingRule; data: AdminCommerceSettings; onSave: SaveShipping; saving: boolean }) {
  const initial: RuleForm = rule ?? { shippingZoneId: '', shippingMethodId: '', basePrice: '0.00', sizeFromSets: 1, sizeToSets: null, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', isActive: true };
  const [form, setForm] = useState<RuleForm>(initial);
  useEffect(() => { if (rule) setForm(rule); }, [rule]);
  const set = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const validRange = !form.sizeToSets || Number(form.sizeToSets) >= form.sizeFromSets;
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!saving && validRange) void onSave(rule ? `/admin/shipping/rules/${rule.shippingRuleId}` : '/admin/shipping/rules', rule ? 'PATCH' : 'POST', {
      ...form, sizeToSets: form.sizeToSets === '' || form.sizeToSets === null ? null : Number(form.sizeToSets),
    }).then(() => { if (!rule) setForm(initial); }).catch(() => {});
  }}><Stack>
    {rule && <Text size="sm" c="dimmed">טווח: {rule.sizeFromSets}–{rule.sizeToSets ?? 'ללא הגבלה'} סטים{[rule.sizeSurcharge, rule.timeSurcharge, rule.urgencySurcharge].some((amount) => Number(amount) > 0) ? ' · מוגדרות תוספות מחיר בעריכה המתקדמת' : ''}</Text>}
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select label="אזור משלוח" required searchable disabled={saving} allowDeselect={false} placeholder="בחירת אזור" data={data.shippingZones.map((zone) => ({ value: zone.shippingZoneId, label: `${zone.name} · ${zone.city}` }))} value={form.shippingZoneId || null} onChange={(value) => value && set('shippingZoneId', value)} />
      <Select label="שיטת משלוח" required disabled={saving} allowDeselect={false} placeholder="בחירת שיטה" data={data.shippingMethods.map((method) => ({ value: method.shippingMethodId, label: method.name }))} value={form.shippingMethodId || null} onChange={(value) => value && set('shippingMethodId', value)} />
      <TextInput label="מחיר בסיס (₪)" required disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.basePrice} onChange={(event) => set('basePrice', event.currentTarget.value)} />
    </SimpleGrid>
    <Accordion variant="contained"><Accordion.Item value="advanced"><Accordion.Control>טווח כמויות ותוספות מחיר — מתקדם</Accordion.Control><Accordion.Panel><Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <NumberInput label="מכמות של (סטים)" required min={1} allowDecimal={false} disabled={saving} value={form.sizeFromSets} onChange={(value) => set('sizeFromSets', Number(value))} />
        <NumberInput label="עד כמות של (סטים)" description="ריק — ללא הגבלה" min={form.sizeFromSets} allowDecimal={false} disabled={saving} value={form.sizeToSets ?? ''} onChange={(value) => set('sizeToSets', value)} error={!validRange ? 'הכמות צריכה להיות גדולה או שווה לכמות ההתחלה' : undefined} />
        <TextInput label="תוספת גודל (₪)" required disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.sizeSurcharge} onChange={(event) => set('sizeSurcharge', event.currentTarget.value)} />
        <TextInput label="תוספת זמן (₪)" required disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.timeSurcharge} onChange={(event) => set('timeSurcharge', event.currentTarget.value)} />
        <TextInput label="תוספת דחיפות (₪)" required disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.urgencySurcharge} onChange={(event) => set('urgencySurcharge', event.currentTarget.value)} />
      </SimpleGrid>
      <Switch label="מחיר זה פעיל" disabled={saving} checked={form.isActive} onChange={(event) => set('isActive', event.currentTarget.checked)} />
    </Stack></Accordion.Panel></Accordion.Item></Accordion>
    <Group><Button type="submit" loading={saving} disabled={!form.shippingZoneId || !form.shippingMethodId || !validRange}>{rule ? 'שמירת המחיר' : 'הוספת מחיר'}</Button></Group>
  </Stack></form>;
}

function MethodEditor({ method, onSave, saving }: { method: AdminShippingMethod; onSave: SaveShipping; saving: boolean }) {
  const [form, setForm] = useState(method);
  useEffect(() => setForm(method), [method]);
  return <Card withBorder><Stack>
    <TextInput label="שם שיטת המשלוח" required disabled={saving} value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} />
    <Switch label="השיטה זמינה" disabled={saving} checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.currentTarget.checked })} />
    <Group><Button loading={saving} disabled={!form.name.trim()} onClick={() => { void onSave(`/admin/shipping/methods/${method.shippingMethodId}`, 'PATCH', { name: form.name, isActive: form.isActive }).catch(() => {}); }}>שמירת השיטה</Button></Group>
  </Stack></Card>;
}
