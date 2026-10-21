import { Button, Group, Image, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { CatalogSection } from '../features/catalog/CatalogSection';
import { EventGallery } from '../features/event-gallery/EventGallery';
import { useEventGalleryQuery } from '../features/event-gallery/query';

export function HomePage() {
  const gallery = useEventGalleryQuery();
  const image = gallery.data?.data.find((item) => item.isFeatured);
  return <>
    <section className="hero content-width" aria-labelledby="hero-title">
      <Stack className="hero-copy" gap="xl">
        <Text className="eyebrow">זיס</Text>
        <Title id="hero-title" order={1}>משהו מתוק.<br />בדיוק בשבילך.</Title>
        <Text size="lg" className="hero-description">מגלים את המוצרים, בוחרים את הכמויות המתאימות ומרכיבים עגלה בדרך שלכם.</Text>
        <Group><Button component={Link} to="/catalog" rightSection={<IconArrowLeft size={18} />}>לקטלוג המלא</Button>
          <Button component="a" href="#gallery" variant="outline">לגלריה</Button></Group>
        <Text size="sm" c="dimmed">בחירת אפשרות וכמות יחידות קנייה בכל מוצר</Text>
      </Stack>
      {gallery.isPending ? <Skeleton className="hero-image" /> : image ?
        <a href="#gallery" className="hero-image-link" aria-label="לגלריית האירועים">
          <Image className="hero-image" src={image.url} alt={image.altText} fit="cover" fallbackSrc="/zis-logo-dark.png" />
        </a> : <div className="hero-brand" aria-hidden="true"><Image src="/zis-logo-dark.png" alt="" w="58%" /></div>}
    </section>
    <div className="content-width"><CatalogSection /><EventGallery /></div>
  </>;
}
