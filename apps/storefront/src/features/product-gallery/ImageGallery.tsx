import { AspectRatio, Button, Group, Modal, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { useEffect, useState } from 'react';
import { SafeImage } from './SafeImage';

export interface GalleryImage { imageId: string; url: string; altText: string; caption?: string | null }

export function ImageGallery({ images, title, columns = 4, prominent = false, productLayout = false }: { images: GalleryImage[]; title: string; columns?: number; prominent?: boolean; productLayout?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const current = selected === null ? undefined : images[selected];
  const move = (offset: number) => setSelected((value) => value === null ? null : (value + offset + images.length) % images.length);
  const moveActive = (offset: number) => setActiveImage((value) => (value + offset + images.length) % images.length);
  useEffect(() => { setSelected(null); setActiveImage(0); }, [images]);
  if (images.length === 0) return <AspectRatio ratio={4 / 3}><Text c="dimmed" ta="center">אין תמונות להצגה כרגע</Text></AspectRatio>;
  if (productLayout) return <>
    <Stack gap="sm" className="product-gallery">
      <UnstyledButton onClick={() => setSelected(activeImage)} aria-label={`הגדלת ${images[activeImage].altText || title}`} className="product-gallery-main">
        <AspectRatio ratio={4 / 3}><SafeImage src={images[activeImage].url} alt={images[activeImage].altText || title} fit="cover" /></AspectRatio>
      </UnstyledButton>
      {images.length > 1 && <>
        <Group justify="space-between" align="center" className="product-gallery-controls">
          <Button variant="subtle" size="compact-sm" onClick={() => moveActive(-1)} aria-label="תמונה קודמת">‹</Button>
          <Text size="sm" c="dimmed" aria-live="polite">{activeImage + 1} / {images.length}</Text>
          <Button variant="subtle" size="compact-sm" onClick={() => moveActive(1)} aria-label="תמונה הבאה">›</Button>
        </Group>
        <Group gap="xs" className="product-gallery-thumbnails" wrap="nowrap">
          {images.map((image, index) => <UnstyledButton key={image.imageId} onClick={() => setActiveImage(index)}
            aria-label={`הצגת ${image.altText || `תמונה ${index + 1}`}`} aria-pressed={index === activeImage}
            className={`product-gallery-thumbnail${index === activeImage ? ' is-active' : ''}`}>
            <SafeImage src={image.url} alt="" w={86} h={64} fit="cover" />
          </UnstyledButton>)}
        </Group>
      </>}
    </Stack>
    <Modal opened={Boolean(current)} onClose={() => setSelected(null)} title={title} size="xl" centered
      closeButtonProps={{ 'aria-label': 'סגירת התמונה' }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); }
      }}>
      {current && <Stack>
        <SafeImage src={current.url} alt={current.altText || title} fit="contain" mah="65vh" />
        {current.caption && <Text ta="center">{current.caption}</Text>}
        {images.length > 1 && <Group justify="space-between"><Button variant="light" onClick={() => move(-1)}>תמונה קודמת</Button>
          <Text size="sm" aria-live="polite">{(selected ?? 0) + 1} / {images.length}</Text><Button variant="light" onClick={() => move(1)}>תמונה הבאה</Button></Group>}
      </Stack>}
    </Modal>
  </>;
  return <>
    {prominent && <UnstyledButton onClick={() => setSelected(0)} aria-label={`הגדלת ${images[0].altText || title}`}>
      <AspectRatio ratio={4 / 3}><SafeImage src={images[0].url} alt={images[0].altText || title} fit="cover" /></AspectRatio>
    </UnstyledButton>}
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: columns }} spacing="lg">
      {images.map((image, index) => <UnstyledButton key={image.imageId} onClick={() => setSelected(index)}
        aria-label={`הגדלת ${image.altText || title}`} style={{ overflow: 'hidden', borderRadius: '0 0 0 var(--mantine-radius-md)' }}>
        <AspectRatio ratio={4 / 3}><SafeImage src={image.url} alt={image.altText || title} fit="cover" /></AspectRatio>
      </UnstyledButton>)}
    </SimpleGrid>
    <Modal opened={Boolean(current)} onClose={() => setSelected(null)} title={title} size="xl" centered
      closeButtonProps={{ 'aria-label': 'סגירת התמונה' }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); }
      }}>
      {current && <Stack>
        <SafeImage src={current.url} alt={current.altText || title} fit="contain" mah="65vh" />
        {current.caption && <Text ta="center">{current.caption}</Text>}
        {images.length > 1 && <>
          <Group justify="space-between"><Button variant="light" onClick={() => move(-1)}>תמונה קודמת</Button>
            <Text size="sm" aria-live="polite">{(selected ?? 0) + 1} / {images.length}</Text><Button variant="light" onClick={() => move(1)}>תמונה הבאה</Button></Group>
          <Group gap="xs" justify="center">{images.map((image, index) => <UnstyledButton key={image.imageId}
            onClick={() => setSelected(index)} aria-label={`בחירת ${image.altText || `תמונה ${index + 1}`}`} aria-pressed={index === selected}
            style={{ border: index === selected ? '2px solid var(--mantine-primary-color-filled)' : '2px solid transparent' }}>
            <SafeImage src={image.url} alt="" w={60} h={48} fit="cover" />
          </UnstyledButton>)}</Group>
        </>}
      </Stack>}
    </Modal>
  </>;
}
