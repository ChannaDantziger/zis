import { CatalogMediaEditor } from './CatalogMediaEditor.js';
import { observer } from 'mobx-react-lite';
import { Alert, Button, Card, Group, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { catalogStore as store } from './catalog.store.js';
import { CatalogVariantEditor } from './CatalogVariantEditor.js';
import type { ProductStatus } from './catalog.types.js';
export const productStatuses = [
  { value: 'draft', label: 'טיוטה' }, { value: 'active', label: 'פעיל' }, { value: 'hidden', label: 'מוסתר' },
  { value: 'sold_out', label: 'אזל' }, { value: 'archived', label: 'בארכיון' },
];
export const CatalogProductEditor = observer(function CatalogProductEditor() {
  const form = store.product;
  if (!form) return null;
  return <Card withBorder radius="lg"><Stack>
    <Group justify="space-between"><Title order={2}>{form.productId ? 'עריכת מוצר' : 'מוצר חדש'}</Title><Button variant="subtle" disabled={store.saving} onClick={() => store.close()}>סגור</Button></Group>
    {store.catalog && store.catalog.categories.length === 0 && <Alert color="yellow">אין קטגוריות לבחירה. יש להגדיר קטגוריה לפני שניתן לשמור מוצר.</Alert>}
    <form onSubmit={(event) => { event.preventDefault(); void store.saveProduct(); }}><Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput disabled={store.saving || store.productNeedsRefresh} label="שם מוצר" required maxLength={200} value={form.name} onChange={(e) => store.setProduct('name', e.currentTarget.value)} />
        <Select disabled={store.saving || store.productNeedsRefresh} label="קטגוריה" required searchable data={store.catalog?.categories.map((c) => ({ value: c.categoryId, label: c.name })) ?? []} value={form.categoryId} onChange={(v) => v && store.setProduct('categoryId', v)} />
        <NumberInput disabled={store.saving || store.productNeedsRefresh} label="יחידות בכל סט" min={1} allowDecimal={false} required value={form.setSize} onChange={(v) => store.setProduct('setSize', Number(v))} />
        {form.variants.length === 0 && <><TextInput disabled={store.saving || store.productNeedsRefresh} label="מחיר ליחידה (₪)" inputMode="decimal" value={form.pricePerSet} onChange={(e) => store.setProduct('pricePerSet', e.currentTarget.value)} />
        <NumberInput disabled={store.saving || store.productNeedsRefresh} label="מלאי זמין" min={0} allowDecimal={false} value={form.availableSets} onChange={(v) => store.setProduct('availableSets', Number(v))} /></>}
        <NumberInput disabled={store.saving || store.productNeedsRefresh} label="סדר הצגה" min={0} step={10} allowDecimal={false} value={form.displayOrder} onChange={(v) => store.setProduct('displayOrder', Number(v))} />
        {form.productId && <Select disabled={store.saving || store.productNeedsRefresh} label="מצב פרסום" data={productStatuses} value={form.status} onChange={(v) => v && store.setProduct('status', v as ProductStatus)} />}
      </SimpleGrid>
      <Textarea disabled={store.saving || store.productNeedsRefresh} label="תיאור" value={form.description ?? ''} onChange={(e) => store.setProduct('description', e.currentTarget.value || null)} />
      {!form.productId && <Text size="sm" c="dimmed">המוצר נשמר תחילה כטיוטה כדי להוסיף תמונות בבטחה, ויתפרסם אוטומטית כפעיל לאחר שתמונת המוצר ונתוני המסחר יהיו מוכנים. מוצר עם וריאציות יתפרסם לאחר שלכל וריאציה פעילה תהיה תמונה.</Text>}
      <Button type="submit" loading={store.saving} disabled={!form.categoryId}>{store.productNeedsRefresh ? 'רענן מוצר' : 'שמור מוצר'}</Button>
    </Stack></form>
    <CatalogMediaEditor />
    {form.productId && <><Group justify="space-between"><Title order={3}>וריאציות</Title><Button disabled={store.saving} onClick={() => store.editVariant()}>הוסף וריאציה</Button></Group>
      {form.variants.length === 0 && <Text c="dimmed">עדיין אין וריאציות למוצר</Text>}
      {form.variants.map((v) => <Card withBorder key={v.productVariantId}><Group justify="space-between"><div><Text fw={600}>{v.name} · {v.productCode}</Text><Text size="sm">₪{v.pricePerSet} לסט · מלאי {v.availableSets} · {productStatuses.find((s) => s.value === v.status)?.label}</Text></div><Button variant="light" disabled={store.saving} onClick={() => store.editVariant(v)}>ערוך</Button></Group></Card>)}
      <CatalogVariantEditor /></>}
  </Stack></Card>;
});
