import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Badge, Button, Card, Checkbox, FileButton, Group, Image, NumberInput, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { galleryStore as store } from './gallery.store.js';

export const GalleryEditor = observer(function GalleryEditor() {
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  useEffect(() => { void store.load(); return () => store.clearPending(); }, []);
  const busy = store.saving || store.loading;
  return <Stack maw={1200} mx="auto">
    <Group justify="space-between"><div><Title order={1}>גלריה כללית</Title><Text c="dimmed">כל תמונה חדשה מוצגת באתר. אפשר להסתיר אותה זמנית ולבחור בכוכב תמונה אחת לתמונה הגדולה בראש הדף.</Text></div><Button variant="light" onClick={() => void store.load()} disabled={busy}>רענן</Button></Group>
    {store.error && <Alert color="red" role="alert">{store.error}</Alert>}
    <Card withBorder p="xl" bg={over ? 'blue.0' : undefined} style={{ borderStyle: 'dashed' }}
      onDragOver={(event) => { event.preventDefault(); if (!busy) setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(event) => { event.preventDefault(); setOver(false); if (!busy) store.selectFiles(Array.from(event.dataTransfer.files)); }}>
      <Stack align="center" justify="center" mih={210}>
        <Title order={3}>גררי לכאן כמה תמונות יחד</Title>
        <Text c="dimmed" ta="center">או בחרי כמה תמונות מהמחשב · JPEG, PNG, WebP · עד 5 MiB לתמונה</Text>
        <FileButton multiple accept="image/jpeg,image/png,image/webp" onChange={(files) => store.selectFiles(files)}>{(props) => <Button {...props} disabled={busy}>בחירת תמונות</Button>}</FileButton>
      </Stack>
    </Card>
    {store.pending.length > 0 && <Stack>
      <Group><Text>{store.pending.length} תמונות ממתינות להעלאה</Text><Button loading={store.saving} disabled={store.loading} onClick={() => void store.add()}>העלאת התמונות</Button><Button variant="subtle" disabled={busy} onClick={() => store.clearPending()}>נקה בחירה</Button></Group>
      <SimpleGrid cols={{ base: 2, sm: 4, lg: 6 }}>{store.pending.map((item, index) => <Card withBorder key={item.preview} p="xs"><Stack gap="xs">
        <Image src={item.preview} alt={`תמונה שנבחרה להעלאה ${index + 1}`} h={120} fit="contain" radius="sm" />
        <Button variant="subtle" size="xs" disabled={busy} aria-label={`הסרת תמונה ${index + 1} מהבחירה`} onClick={() => store.removePending(item.preview)}>הסר מהבחירה</Button>
      </Stack></Card>)}</SimpleGrid>
      <Text size="sm" c="dimmed">לאחר ההעלאה התמונות יוצגו באתר כברירת מחדל.</Text>
    </Stack>}
    {!store.loading && !store.images.length && <Text ta="center" c="dimmed">עדיין אין תמונות בגלריה</Text>}
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
      {store.images.map((image, index) => <Card withBorder key={image.imageId} draggable={!busy}
        onDragStart={(event) => { setDragged(image.imageId); event.dataTransfer.setData('text/plain', image.imageId); }}
        onDragEnd={() => setDragged(null)} onDragOver={(event) => { if (dragged) event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); if (dragged) void store.move(dragged, index + 1); setDragged(null); }}>
        <Stack gap="sm">
          <Group justify="space-between"><Badge variant="light">{index + 1}</Badge><Text size="xs" c="dimmed">גררי לשינוי מיקום</Text></Group>
          <Image src={image.url} alt={`תמונת גלריה ${index + 1}`} h={180} fit="contain" draggable={false} />
          <Checkbox size="xs" label="מוצגת באתר" checked={image.isActive} disabled={busy} onChange={(event) => void store.setActive(image, event.currentTarget.checked)} />
          <Button variant={image.isFeatured ? 'filled' : 'light'} color="yellow" size="xs"
            leftSection={image.isFeatured ? <IconStarFilled size={16} /> : <IconStar size={16} />}
            disabled={busy || image.isFeatured || !image.isActive} onClick={() => void store.setFeatured(image)}
            aria-label={image.isFeatured ? `תמונה ${index + 1} היא התמונה הגדולה` : `בחירת תמונה ${index + 1} לתמונה הגדולה`}>
            {image.isFeatured ? 'התמונה הגדולה' : image.isActive ? 'הגדרה כתמונה הגדולה' : 'יש להציג לפני בחירה'}
          </Button>
          <Group justify="space-between" align="end">
            <NumberInput label="מיקום" aria-label={`מיקום תמונה ${index + 1}`} w={90} min={1} max={store.images.length} allowDecimal={false} key={`${image.imageId}-${index}`} defaultValue={index + 1} disabled={busy}
              onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value > 0) void store.move(image.imageId, value); }} />
            <Button color="red" variant="subtle" size="xs" disabled={busy} onClick={() => { if (window.confirm('למחוק לצמיתות את תמונת הגלריה ואת הקובץ?')) void store.remove(image); }}>מחק</Button>
          </Group>
          <Group grow><Button size="xs" variant="light" disabled={busy || index === 0} aria-label={`הקדמת תמונה ${index + 1}`} onClick={() => void store.move(image.imageId, index)}>הקדמה</Button>
            <Button size="xs" variant="light" disabled={busy || index === store.images.length - 1} aria-label={`העברת תמונה ${index + 1} אחורה`} onClick={() => void store.move(image.imageId, index + 2)}>אחורה</Button></Group>
        </Stack>
      </Card>)}
    </SimpleGrid>
  </Stack>;
});
