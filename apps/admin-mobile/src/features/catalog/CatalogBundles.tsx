import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Badge, Button, Card, FileInput, Group, Image, NumberInput, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { bundlesStore as bundles } from './bundles.store.js';
import type { BundleImage } from './bundles.store.js';
import { catalogStore } from './catalog.store.js';

const INITIAL_ITEMS = 3;
export const BundleSection = observer(function BundleSection({ categoryId }: { categoryId: string }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); void bundles.load(categoryId); }, [categoryId]);
  return <Stack>
    <Group justify="space-between"><Group><Title order={2} size="h3">מארזים</Title>
      {bundles.items.length > INITIAL_ITEMS && <Button variant="subtle" onClick={() => setExpanded(!expanded)} rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}>{expanded ? 'הצג פחות' : 'הצג הכול'}</Button>}
    </Group><Button disabled={bundles.saving} onClick={() => bundles.create(categoryId)}>הוספת מארז</Button></Group>
    {bundles.error && <Alert color="red">{bundles.error}</Alert>}
    {bundles.loading ? <Text>טוען מארזים...</Text> : !bundles.items.length ? <Text c="dimmed">עדיין אין מארזים בקטגוריה.</Text> :
      (expanded ? bundles.items : bundles.items.slice(0, INITIAL_ITEMS)).map(item => <Card withBorder radius="lg" key={item.bundleId}>
        <Group justify="space-between"><Group>{item.images.find(image => image.isPrimary && !image.isDeleted)?.url && <Image src={item.images.find(image => image.isPrimary && !image.isDeleted)?.url} w={64} h={64} fit="contain" alt={item.name} />}
          <Stack gap={4}><Text fw={700}>{item.name}</Text><Text size="sm">{item.unitCount} יחידות במארז</Text><Badge color="gray">לא מוצג באתר</Badge></Stack>
        </Group><Button variant="light" onClick={() => bundles.edit(item)}>עריכת מארז</Button></Group>
      </Card>)}
  </Stack>;
});

export const BundleEditor = observer(function BundleEditor() {
  const form = bundles.form;
  if (!form) return null;
  return <Stack>
    <Group justify="space-between"><Title order={2}>{form.bundleId ? form.name : 'מארז חדש'}</Title><Button variant="subtle" onClick={() => bundles.close()}>חזרה לקטגוריה</Button></Group>
    <Alert color="blue">המארז נשמר בניהול בלבד ואינו מוצג בחנות בשלב זה.</Alert>
    {bundles.error && <Alert color="red">{bundles.error}</Alert>}
    <Card withBorder radius="lg" component="form" onSubmit={e => { e.preventDefault(); void bundles.save(); }}><Stack>
      <Title order={3}>פרטי המארז</Title>
      <TextInput label="שם המארז" required maxLength={200} value={form.name} onChange={e => bundles.set('name', e.currentTarget.value)} />
      <Textarea label="תיאור המארז" value={form.description ?? ''} onChange={e => bundles.set('description', e.currentTarget.value || null)} />
      <Select label="קטגוריה" required allowDeselect={false} data={catalogStore.catalog?.categories.map(c => ({ value: c.categoryId, label: c.name })) ?? []} value={form.categoryId} onChange={value => value && bundles.set('categoryId', value)} />
      <NumberInput label="מספר יחידות במארז" required min={1} allowDecimal={false} value={form.unitCount} onChange={value => bundles.set('unitCount', Number(value))} />
      {form.bundleId && <Select label="מצב" allowDeselect={false} value={form.status} data={[{value:'draft',label:'טיוטה'},{value:'hidden',label:'מוסתר'}]} onChange={value => value && bundles.set('status', value as BundleStatus)} />}
      <Button type="submit" loading={bundles.saving} disabled={!form.name.trim() || !form.categoryId || !Number.isSafeInteger(form.unitCount) || form.unitCount < 1}>{form.bundleId ? 'שמירת שינויים' : 'שמירה והוספת תמונה'}</Button>
    </Stack></Card>
    {form.bundleId && <Card withBorder><Stack><Title order={3}>תמונות מארז</Title>
      {bundles.changed && <Alert color="yellow">שמרי את השינויים לפני עריכת התמונות.</Alert>}
      {form.images.map(image => <BundleImageRow key={image.imageId} image={image} />)}
      {bundles.pendingUpload ? <Button variant="light" disabled={bundles.saving} onClick={() => void bundles.upload()}>נסי שוב לשמור את התמונה</Button> :
        <FileInput label="הוספת תמונה" placeholder="בחרי קובץ" accept="image/jpeg,image/png,image/webp" value={null} disabled={bundles.changed || bundles.saving} onChange={file => { if (file) void bundles.upload(file); }} />}
      <Text size="sm" c="dimmed">JPEG, PNG או WebP עד 5 MiB. התמונה הראשונה היא התמונה הראשית.</Text>
    </Stack></Card>}
  </Stack>;
});
type BundleStatus = 'draft' | 'hidden';

const BundleImageRow = observer(function BundleImageRow({ image }: { image: BundleImage }) {
  const [editing, setEditing] = useState(false), [altText, setAltText] = useState(image.altText), [order, setOrder] = useState(image.sortOrder);
  return <Card withBorder><Stack><Group justify="space-between"><Group>{image.url && <Image src={image.url} w={72} h={72} fit="contain" alt={image.altText} />}<Text>{image.isDeleted ? 'מחיקת התמונה ממתינה לניסיון חוזר' : image.isPrimary ? 'תמונה ראשית' : 'תמונת גלריה'}</Text></Group>
    <Group>{!image.isDeleted && <Button variant="light" disabled={bundles.changed || bundles.saving} onClick={() => setEditing(!editing)}>עריכת תמונה</Button>}
      <Button variant="light" color="red" disabled={bundles.changed || bundles.saving} onClick={() => void bundles.removeImage(image)}>{image.isDeleted ? 'נסה למחוק שוב' : 'מחיקת תמונה'}</Button></Group></Group>
    {editing && <><TextInput label="תיאור התמונה" value={altText} onChange={e => setAltText(e.currentTarget.value)} />
      <NumberInput label="סדר תצוגה" min={0} allowDecimal={false} value={order} onChange={v => setOrder(Number(v))} />
      <Button disabled={!altText.trim() || bundles.changed || bundles.saving} onClick={() => { void bundles.updateImage(image, altText, order); setEditing(false); }}>שמור תמונה</Button></>}
  </Stack></Card>;
});
