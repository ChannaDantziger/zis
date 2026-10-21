import { Alert, Button, Skeleton, Stack, Text, Title } from '@mantine/core';
import { ImageGallery } from '../product-gallery/ImageGallery';
import { useEventGalleryQuery } from './query';

export function EventGallery() {
  const result = useEventGalleryQuery();
  return <Stack component="section" id="gallery" py="xl" gap="lg" aria-labelledby="events-title">
    <div><Text size="sm" c="dimmed">רגעים מתוקים</Text><Title order={2} id="events-title">גלריית אירועים</Title></div>
    {result.isPending && <Skeleton h={220} aria-label="טעינת גלריית אירועים" />}
    {result.isError && <Alert title="הגלריה אינה זמינה כרגע" color="orange"><Button variant="subtle" onClick={() => void result.refetch()}>ניסיון נוסף</Button></Alert>}
    {result.data && (result.data.data.length === 0 ? <Text c="dimmed">תמונות אירועים יופיעו כאן לאחר פרסומן.</Text>
      : <ImageGallery images={result.data.data} title="גלריית אירועים" columns={5} />)}
  </Stack>;
}
