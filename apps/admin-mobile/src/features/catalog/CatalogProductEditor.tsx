import { observer } from 'mobx-react-lite';
import { Badge, Button, Card, Group, NumberInput, SegmentedControl, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { catalogStore as store } from './catalog.store.js';
import { CatalogMediaEditor } from './CatalogMediaEditor.js';
import { CatalogVariantEditor } from './CatalogVariantEditor.js';
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
      {form.variants.length === 0 ? <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput disabled={disabled} label="מחיר ליחידת קנייה (₪)" description={`יחידת קנייה מכילה ${form.setSize} יחידות מוצר`} required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" value={form.pricePerSet ?? ''} onChange={(event) => store.setProduct('pricePerSet', event.currentTarget.value)} />
        <NumberInput disabled={disabled} label="כמות במלאי" min={0} allowDecimal={false} required value={form.availableSets} onChange={(value) => store.setProduct('availableSets', Number(value))} />
      </SimpleGrid> : <Text size="sm" c="dimmed">למוצר יש אפשרויות לבחירה. המחיר והמלאי של כל אפשרות נמצאים בעריכה המתקדמת.</Text>}
      {advanced && <Stack gap="sm">
        <Title order={3} size="h4">הגדרות נוספות</Title>
        <Select label="קטגוריה" disabled={disabled} required searchable allowDeselect={false}
          data={store.catalog?.categories.map((category) => ({ value: category.categoryId, label: category.name })) ?? []}
          value={form.categoryId} onChange={(value) => value && store.setProduct('categoryId', value)} />
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
    {advanced && <Card withBorder radius="lg"><Stack>
      <Group justify="space-between"><div><Title order={2} size="h3">וריאציות — אפשרויות לבחירה</Title><Text c="dimmed" size="sm">למשל טעמים או גדלים, עם מחיר ומלאי לכל אפשרות.</Text></div>
        {form.productId && <Button disabled={disabled || store.productHasChanges} variant="light" onClick={() => store.editVariant()}>הוספת וריאציה</Button>}</Group>
      {store.productHasChanges && form.productId && <Text size="sm" c="dimmed">שמרי קודם את השינויים בפרטי המוצר כדי לערוך וריאציות.</Text>}
      {!form.productId ? <Text c="dimmed">שמרי את המוצר כדי להוסיף לו וריאציות.</Text> : <>
        {form.variants.length === 0 && <Text c="dimmed">למוצר אין וריאציות. אפשר להשאיר אותו כמוצר רגיל.</Text>}
        {form.variants.map((variant) => <Card withBorder key={variant.productVariantId}><Group justify="space-between"><div>
          <Text fw={600}>{variant.name}</Text><Text size="sm">₪{variant.pricePerSet} לסט · מלאי {variant.availableSets}</Text>
          <Text size="sm" c="dimmed">{productStatuses.find((status) => status.value === variant.status)?.label}</Text>
        </div><Button variant="light" disabled={store.saving || store.productHasChanges} onClick={() => store.editVariant(variant)}>עריכת וריאציה</Button></Group></Card>)}
        {!store.productHasChanges && <CatalogVariantEditor />}
      </>}
    </Stack></Card>}
  </Stack>;
});
