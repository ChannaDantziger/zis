import { observer } from 'mobx-react-lite';
import { Button, Card, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import { catalogStore as store } from './catalog.store.js';
import type { VariantStatus } from './catalog.types.js';
const statuses = [{ value: 'active', label: 'פעילה' }, { value: 'hidden', label: 'מוסתרת' }, { value: 'sold_out', label: 'אזלה' }, { value: 'archived', label: 'בארכיון' }];
export const CatalogVariantEditor = observer(function CatalogVariantEditor() {
  const form = store.variant;
  if (!form) return null;
  const isNew = !form.productVariantId;
  return <Card withBorder bg="gray.0"><form onSubmit={(event) => { event.preventDefault(); void store.saveVariant(); }}><Stack>
    <Title order={3}>{isNew ? 'וריאציה חדשה' : 'עריכת וריאציה'}</Title>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput disabled={store.saving || store.variantNeedsRefresh} required label="שם וריאציה" value={form.name} onChange={(e) => store.setVariant('name', e.currentTarget.value)} />
      {isNew ? <TextInput required label="קוד מוצר" disabled={store.saving || store.variantNeedsRefresh} value={form.productCode} onChange={(e) => store.setVariant('productCode', e.currentTarget.value)} /> : <Text size="sm" c="dimmed">קוד מוצר: {form.productCode}</Text>}
      <TextInput disabled={store.saving || store.variantNeedsRefresh} required label="מחיר לסט (₪)" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" value={form.pricePerSet} onChange={(e) => store.setVariant('pricePerSet', e.currentTarget.value)} />
      <NumberInput disabled={store.saving || store.variantNeedsRefresh} label="סף מלאי נמוך בסטים" min={0} allowDecimal={false} required value={form.lowStockThresholdSets} onChange={(v) => store.setVariant('lowStockThresholdSets', Number(v))} />
      <NumberInput disabled={store.saving || store.variantNeedsRefresh} label="כמות ייצור יומית ברירת מחדל" min={1} allowDecimal={false} required value={form.defaultProductionQuantitySets} onChange={(v) => store.setVariant('defaultProductionQuantitySets', Number(v))} />
      {isNew ? <><NumberInput disabled={store.saving || store.variantNeedsRefresh} label="מלאי פתיחה בסטים" min={0} allowDecimal={false} required value={form.availableSets} onChange={(v) => store.setVariant('availableSets', Number(v))} /><Switch disabled={store.saving || store.variantNeedsRefresh} label="וריאציית ברירת מחדל" checked={form.isDefault} onChange={(e) => store.setVariant('isDefault', e.currentTarget.checked)} /><Text size="sm" c="dimmed">וריאציה חדשה נשמרת מוסתרת עד שמעלים לה תמונה. לאחר מכן אפשר להפעיל אותה.</Text></> : <Select disabled={store.saving || store.variantNeedsRefresh} label="זמינות" data={statuses} value={form.status} onChange={(v) => v && store.setVariant('status', v as VariantStatus)} />}
    </SimpleGrid>
    {!isNew && <Text size="sm" c="dimmed">המלאי אינו משתנה בעריכת מחיר וזמינות. התאמת מלאי נעשית בנפרד עם סיבה ותיעוד.</Text>}
    <Group><Button type="submit" loading={store.saving}>{store.variantNeedsRefresh ? 'רענן וריאציה' : 'שמור וריאציה'}</Button><Button variant="subtle" disabled={store.saving} onClick={() => { store.variant = null; }}>בטל</Button></Group>
  </Stack></form></Card>;
});
