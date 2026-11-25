import { observer } from 'mobx-react-lite';
import { Badge, Button, Card, Group, NumberInput, SegmentedControl, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { catalogStore as store } from './catalog.store.js';
import { CatalogMediaEditor } from './CatalogMediaEditor.js';
import type { ProductStatus } from './catalog.types.js';

export const productStatuses = [
  { value: 'draft', label: 'טיוטה' }, { value: 'active', label: 'פעיל' }, { value: 'hidden', label: 'מוסתר' },
  { value: 'sold_out', label: 'אזל' }, { value: 'archived', label: 'בארכיון' },
];

export const CatalogProductEditor = observer(function CatalogProductEditor() {
  const form = store.product;
  if (!form) return null;
  const advanced = store.editorMode === 'advanced';
  const disabled = store.saving || store.productNeedsRefresh;
  return <Stack gap="lg">
    <Group justify="space-between">
      <SegmentedControl aria-label="סוג עריכת מוצר" disabled={store.saving} value={store.editorMode}
        data={[{ value: 'basic', label: 'עריכה רגילה' }, { value: 'advanced', label: 'עריכה מתקדמת' }]}
        onChange={(value) => store.setEditorMode(value as 'basic' | 'advanced')} />
      <Button variant="subtle" disabled={store.saving} onClick={() => store.close()}>חזרה למוצרים</Button>
    </Group>
    {form.productId && <Group><Badge color={form.isVisible ? 'green' : 'gray'}>{form.isVisible ? 'מוצג באתר' : 'לא מוצג באתר'}</Badge>
      {!form.isVisible && <Text size="sm" c="dimmed">{form.visibilityReasons.join(' · ')}</Text>}</Group>}
    <Card withBorder radius="lg" component="form" onSubmit={(event) => { event.preventDefault(); void store.saveProduct(); }}><Stack>
      <Title order={2} size="h3">פרטי המוצר</Title>
      <TextInput disabled={disabled} label="שם המוצר" required maxLength={200} value={form.name} onChange={(event) => store.setProduct('name', event.currentTarget.value)} />
      <Textarea disabled={disabled} label="תיאור המוצר" autosize minRows={2} value={form.description ?? ''} onChange={(event) => store.setProduct('description', event.currentTarget.value || null)} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput disabled={disabled} label="מחיר ליחידה (₪)" description={`מחיר הסט מחושב לפי ${form.setSize} יחידות מוצר`} required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" value={form.pricePerUnit ?? ''} onChange={(event) => store.setProduct('pricePerUnit', event.currentTarget.value)} />
        <NumberInput disabled={disabled} label="מלאי ביחידות פיזיות" description={`זמינים למכירה ${form.setSize > 0 ? Math.floor(form.availableItems / form.setSize) : 0} סטים שלמים`} min={0} allowDecimal={false} required value={form.availableItems} onChange={(value) => store.setProduct('availableItems', Number(value))} />
      </SimpleGrid>
      {advanced && <Stack gap="sm">
        <Title order={3} size="h4">הגדרות נוספות</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput disabled={disabled} label="יחידות בכל סט" min={1} allowDecimal={false} required value={form.setSize} onChange={(value) => store.setProduct('setSize', Number(value))} />
          <NumberInput disabled={disabled} label="סדר הצגה" min={0} step={10} allowDecimal={false} required value={form.displayOrder} onChange={(value) => store.setProduct('displayOrder', Number(value))} />
          {form.productId && <Select disabled={disabled} label="מצב פרסום" allowDeselect={false} data={productStatuses} value={form.status} onChange={(value) => value && store.setProduct('status', value as ProductStatus)} />}
        </SimpleGrid>
      </Stack>}
      {!form.productId && <Text size="sm" c="dimmed">לאחר השמירה הוסיפי תמונה. המוצר יוצג באתר כשהפרטים והתמונות יהיו מוכנים.</Text>}
      <Group><Button type="submit" loading={store.saving} disabled={!form.categoryId || !form.name.trim()}>
        {store.productNeedsRefresh ? 'רענון המוצר שנשמר' : form.productId ? 'שמירת שינויים' : 'שמירה והוספת תמונה'}
      </Button></Group>
    </Stack></Card>
    {form.productId && <CatalogMediaEditor />}
  </Stack>;
});
