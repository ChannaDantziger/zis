import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Button, Card, FileInput, Group, Image, NumberInput, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { catalogStore } from './catalog.store.js';
import { catalogMediaStore as media } from './catalog-media.store.js';
export const CatalogMediaEditor = observer(function CatalogMediaEditor() {
  const product = catalogStore.product;
  useEffect(() => { media.reset(); return () => media.reset(); }, [product?.productId]);
  useEffect(() => { if (catalogStore.editorMode === 'basic' && media.productVariantId) media.reset(); }, [catalogStore.editorMode]);
  if (!product) return null;
  return <Card withBorder><Stack>
    <Title order={3}>תמונות מוצר</Title>
    {catalogStore.productHasChanges && <Alert color="yellow">שמרי את השינויים בפרטי המוצר לפני עריכת התמונות.</Alert>}
    <fieldset disabled={catalogStore.saving || catalogStore.productHasChanges} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}><Stack>
    {!product.productId && <Alert color="blue" title="אפשר להוסיף תמונות אחרי שמירת המוצר">שמרי את המוצר. לאחר השמירה אפשר להוסיף תמונה למוצר או לווריאציה.</Alert>}
    <Text size="sm" c="dimmed">JPEG, PNG או WebP עד 5 MiB. התצוגה המקדימה אינה חותכת את הקובץ.</Text>
    {media.error && <Alert color="red">{media.error}{media.metadataSaved ? <Text size="sm">התמונה נשמרה. ניסיון נוסף ירענן את הרשימה בלבד.</Text> : media.uploaded && <Text size="sm">הקובץ כבר הועלה. ניסיון שמירה נוסף ישתמש באותו קובץ.</Text>}</Alert>}
    {media.success && <Alert color="green">{media.success}</Alert>}
    {product.productId && product.images.filter((image) => catalogStore.editorMode === 'advanced' || !image.productVariantId).map((image) => <Card withBorder key={image.imageId}><Group justify="space-between" wrap="nowrap"><Group wrap="nowrap">
      {image.url && <Image src={image.url} alt={image.altText} w={72} h={72} fit="contain" radius="sm" />}
      <div><Text>{image.altText}</Text>{catalogStore.editorMode === 'advanced' && <Text size="sm" c="dimmed">סדר {image.sortOrder} · {product.variants.find((v) => v.productVariantId === image.productVariantId)?.name ?? 'משותפת למוצר'}</Text>}
      </div></Group><Button disabled={media.saving} variant="light" onClick={() => media.edit(image)}>ערוך תמונה</Button></Group></Card>)}
    <form onSubmit={(event) => { event.preventDefault(); void media.save(); }}><Stack>
      <Title order={4}>{media.imageId ? 'עריכת תמונה' : 'העלאת תמונה'}</Title>
      {!media.imageId && <><FileInput label="קובץ תמונה" placeholder={product.productId ? 'בחרי קובץ תמונה' : 'שמרי קודם את המוצר'} accept="image/jpeg,image/png,image/webp" value={media.file} onChange={(file) => media.selectFile(file)} disabled={!product.productId || media.saving || media.metadataSaved} />
        {media.preview && <><Image src={media.preview} alt={media.altText || 'תצוגה מקדימה'} h={200} fit="contain" /><Text size="sm">{media.dimensions}</Text></>}
        {catalogStore.editorMode === 'advanced' && product.variants.length > 0 && <Select disabled={media.metadataSaved} label="התמונה שייכת ל…" clearable placeholder="תמונת מוצר" data={product.variants.map((v) => ({ value: v.productVariantId, label: `וריאציה: ${v.name}` }))} value={media.productVariantId} onChange={(v) => { media.productVariantId = v; }} />}
      </>}
      {product.productId && <><TextInput disabled={media.metadataSaved} required label="תיאור נגישות" value={media.altText} onChange={(e) => { media.altText = e.currentTarget.value; }} />
      {catalogStore.editorMode === 'advanced' && <NumberInput disabled={media.metadataSaved} required min={0} step={10} allowDecimal={false} label="סדר תצוגה" value={media.sortOrder} onChange={(v) => { media.sortOrder = Number(v); }} />}
      </>}
      <Group><Button type="submit" loading={media.saving} disabled={!product.productId || (!media.imageId && !media.file && !media.uploaded)}>{media.metadataSaved ? 'רענן תמונות' : 'שמור תמונה'}</Button>
        {media.imageId && <Button color="red" variant="light" disabled={media.saving || media.metadataSaved} onClick={() => { if (window.confirm('למחוק לצמיתות את התמונה ואת הקובץ?')) void media.removeImage(); }}>מחק תמונה</Button>}
        <Button variant="subtle" disabled={media.saving} onClick={() => media.reset()}>נקה / העלאה חדשה</Button>
      </Group>
    </Stack></form>
    </Stack></fieldset>
  </Stack></Card>;
});

