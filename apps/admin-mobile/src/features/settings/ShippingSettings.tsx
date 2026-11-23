import { useEffect, useState } from 'react';
import { Accordion, Button, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import type { AdminCommerceSettings, AdminShippingRule, AdminShippingZone } from '../../entities/admin.types.js';

type SaveShipping = (path: string, method: 'PATCH' | 'POST', body: unknown) => Promise<unknown>;
type ZoneForm = { name: string; city: string; neighborhood: string | null; dispatchTime: string | null; isActive: boolean; basePrice?: string };
type RuleForm = Omit<AdminShippingRule, 'shippingRuleId' | 'sizeToSets'> & { sizeToSets: string | number | null };
const EMPTY_ZONE: ZoneForm = { name: '', city: '', neighborhood: null, dispatchTime: null, isActive: true, basePrice: '' };
const MONEY_PATTERN = '[0-9]+(\\.[0-9]{1,2})?';

export function ShippingSettings({ data, onSave, saving }: { data: AdminCommerceSettings; onSave: SaveShipping; saving: boolean }) {
  return <Stack>
    <Title order={2}>משלוחים ומחירים</Title>
    <Text size="sm" c="dimmed">מחיר המשלוח נמצא בתוך כל אזור. במתקדמות אפשר להוסיף מחיר לפי כמות.</Text>
    <Accordion variant="separated">
      {data.shippingZones.map((zone) => <Accordion.Item value={zone.shippingZoneId} key={zone.shippingZoneId}>
        <Accordion.Control>{zone.name} · {zone.city}{!zone.isActive && ' · לא פעיל'}</Accordion.Control>
        <Accordion.Panel><Stack>
          <ZoneEditor zone={zone} onSave={onSave} saving={saving} />
          <BasePriceEditor zone={zone} rules={data.shippingRules} onSave={onSave} saving={saving} />
          <Accordion variant="contained"><Accordion.Item value="advanced-prices"><Accordion.Control>הגדרות מתקדמות · מחירים לפי כמות</Accordion.Control><Accordion.Panel><Stack>
            <Text size="sm">כשכמה כללים חלים, השרת בוחר במחיר הגבוה מביניהם. מחיר לפי כמות הנמוך ממחיר הבסיס לא יוזיל את המשלוח.</Text>
            <Accordion>{data.shippingRules.filter((rule) => rule.shippingZoneId === zone.shippingZoneId).map((rule) => <Accordion.Item key={rule.shippingRuleId} value={rule.shippingRuleId}>
              <Accordion.Control>₪{rule.basePrice} · {rule.sizeFromSets}–{rule.sizeToSets ?? 'ללא הגבלה'} סטים{!rule.isActive && ' · לא פעיל'}</Accordion.Control>
              <Accordion.Panel><PriceEditor rule={rule} data={data} onSave={onSave} saving={saving} zoneId={zone.shippingZoneId} /></Accordion.Panel>
            </Accordion.Item>)}<Accordion.Item value="new"><Accordion.Control>הוספת מחיר לפי כמות</Accordion.Control><Accordion.Panel><PriceEditor data={data} onSave={onSave} saving={saving} zoneId={zone.shippingZoneId} /></Accordion.Panel></Accordion.Item></Accordion>
          </Stack></Accordion.Panel></Accordion.Item></Accordion>
        </Stack></Accordion.Panel>
      </Accordion.Item>)}
      <Accordion.Item value="new"><Accordion.Control>הוספת אזור משלוח</Accordion.Control><Accordion.Panel><ZoneEditor onSave={onSave} saving={saving} /></Accordion.Panel></Accordion.Item>
    </Accordion>
  </Stack>;
}

function BasePriceEditor({ zone, rules, onSave, saving }: { zone: AdminShippingZone; rules: AdminShippingRule[]; onSave: SaveShipping; saving: boolean }) {
  const candidates = rules.filter((rule) => rule.shippingZoneId === zone.shippingZoneId && rule.isActive && rule.sizeFromSets === 1 && rule.sizeToSets === null && [rule.sizeSurcharge, rule.timeSurcharge, rule.urgencySurcharge].every((price) => Number(price) === 0));
  const base = candidates.length === 1 ? candidates[0] : undefined;
  const [price, setPrice] = useState(base?.basePrice ?? '');
  useEffect(() => setPrice(base?.basePrice ?? ''), [base?.basePrice, base?.shippingRuleId]);
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (saving || candidates.length > 1 || !price.trim()) return;
    void onSave(base ? `/admin/shipping/rules/${base.shippingRuleId}` : '/admin/shipping/rules', base ? 'PATCH' : 'POST', {
      shippingZoneId: zone.shippingZoneId, basePrice: price, sizeFromSets: 1, sizeToSets: null, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', isActive: true,
    }).catch(() => {});
  }}><Stack>
    <TextInput label="מחיר משלוח באזור (₪)" description={base ? 'מחיר הבסיס לכל כמות' : 'עדיין אין מחיר בסיס פעיל ללא הגבלת כמות'} required inputMode="decimal" pattern={MONEY_PATTERN} value={price} onChange={(event) => setPrice(event.currentTarget.value)} disabled={saving || candidates.length > 1} error={candidates.length > 1 ? 'קיימים כמה מחירי בסיס פעילים. יש להסדיר אותם במתקדמות לפני שמירה.' : undefined} />
    <Group><Button type="submit" loading={saving} disabled={candidates.length > 1 || !price.trim()}>שמירת מחיר האזור</Button></Group>
  </Stack></form>;
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
    {!zone && <TextInput label="מחיר משלוח בסיסי (₪)" required disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.basePrice ?? ''} onChange={(event) => setForm({ ...form, basePrice: event.currentTarget.value })} />}
    <Accordion variant="contained"><Accordion.Item value="advanced"><Accordion.Control>הגדרות מתקדמות</Accordion.Control><Accordion.Panel><Stack>
      <TextInput type="time" label="שעת יציאה מיוחדת לאזור" description="ריק — שימוש בשעת היציאה של החנות" disabled={saving} value={form.dispatchTime ?? ''} onChange={(event) => setForm({ ...form, dispatchTime: event.currentTarget.value || null })} />
      <Switch label="האזור זמין למשלוח" disabled={saving} checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.currentTarget.checked })} />
    </Stack></Accordion.Panel></Accordion.Item></Accordion>
    <Group><Button type="submit" loading={saving} disabled={!form.name.trim() || !form.city.trim() || (!zone && !form.basePrice?.trim())}>{zone ? 'שמירת האזור' : 'הוספת אזור'}</Button></Group>
  </Stack></form>;
}

function PriceEditor({ rule, data, onSave, saving, zoneId }: { zoneId?: string; rule?: AdminShippingRule; data: AdminCommerceSettings; onSave: SaveShipping; saving: boolean }) {
  const initial: RuleForm = rule ?? { shippingZoneId: zoneId ?? '', basePrice: '0.00', sizeFromSets: 1, sizeToSets: null, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', isActive: true };
  const [form, setForm] = useState<RuleForm>(initial);
  useEffect(() => { if (rule) setForm(rule); }, [rule]);
  const set = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const validRange = !form.sizeToSets || Number(form.sizeToSets) >= form.sizeFromSets;
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!saving && validRange) void onSave(rule ? `/admin/shipping/rules/${rule.shippingRuleId}` : '/admin/shipping/rules', rule ? 'PATCH' : 'POST', {
      ...form, sizeToSets: form.sizeToSets === '' || form.sizeToSets === null ? null : Number(form.sizeToSets),
      sizeSurcharge: form.sizeSurcharge || '0.00', timeSurcharge: form.timeSurcharge || '0.00', urgencySurcharge: form.urgencySurcharge || '0.00',
    }).then(() => { if (!rule) setForm(initial); }).catch(() => {});
  }}><Stack>
    {rule && <Text size="sm" c="dimmed">טווח: {rule.sizeFromSets}–{rule.sizeToSets ?? 'ללא הגבלה'} סטים{[rule.sizeSurcharge, rule.timeSurcharge, rule.urgencySurcharge].some((amount) => Number(amount) > 0) ? ' · מוגדרות תוספות מחיר בעריכה המתקדמת' : ''}</Text>}
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select label="אזור משלוח" required searchable disabled={saving || !!zoneId} allowDeselect={false} placeholder="בחירת אזור" data={data.shippingZones.map((zone) => ({ value: zone.shippingZoneId, label: `${zone.name} · ${zone.city}` }))} value={form.shippingZoneId || null} onChange={(value) => value && set('shippingZoneId', value)} />
      <TextInput label="מחיר בסיס (₪)" required disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.basePrice} onChange={(event) => set('basePrice', event.currentTarget.value)} />
    </SimpleGrid>
    <Accordion variant="contained"><Accordion.Item value="advanced"><Accordion.Control>טווח כמויות ותוספות מחיר — מתקדם</Accordion.Control><Accordion.Panel><Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <NumberInput label="מכמות של (סטים)" required min={1} allowDecimal={false} disabled={saving} value={form.sizeFromSets} onChange={(value) => set('sizeFromSets', Number(value))} />
        <NumberInput label="עד כמות של (סטים)" description="ריק — ללא הגבלה" min={form.sizeFromSets} allowDecimal={false} disabled={saving} value={form.sizeToSets ?? ''} onChange={(value) => set('sizeToSets', value)} error={!validRange ? 'הכמות צריכה להיות גדולה או שווה לכמות ההתחלה' : undefined} />
        <TextInput label="תוספת גודל (₪)" description="ריק — 0 ₪" disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.sizeSurcharge} onChange={(event) => set('sizeSurcharge', event.currentTarget.value)} />
        <TextInput label="תוספת זמן (₪)" description="ריק — 0 ₪" disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.timeSurcharge} onChange={(event) => set('timeSurcharge', event.currentTarget.value)} />
        <TextInput label="תוספת דחיפות (₪)" description="ריק — 0 ₪" disabled={saving} inputMode="decimal" pattern={MONEY_PATTERN} value={form.urgencySurcharge} onChange={(event) => set('urgencySurcharge', event.currentTarget.value)} />
      </SimpleGrid>
      <Switch label="מחיר זה פעיל" disabled={saving} checked={form.isActive} onChange={(event) => set('isActive', event.currentTarget.checked)} />
    </Stack></Accordion.Panel></Accordion.Item></Accordion>
    <Group><Button type="submit" loading={saving} disabled={!form.shippingZoneId || !validRange}>{rule ? 'שמירת המחיר' : 'הוספת מחיר'}</Button></Group>
  </Stack></form>;
}

