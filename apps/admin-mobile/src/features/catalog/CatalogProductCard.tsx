import { observer } from 'mobx-react-lite';
import { Badge, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import type { ManagedProduct } from './catalog.types.js';
import { catalogStore as store } from './catalog.store.js';

export const CatalogProductCard = observer(function CatalogProductCard({ product }: { product: ManagedProduct }) {
  const primary = product.images.find((image) => !image.productVariantId && image.imageType === 'primary');
  return <Card withBorder radius="lg"><Group justify="space-between" align="start">
    <Group wrap="nowrap" align="start">
      {primary?.url && <Image src={primary.url} alt={primary.altText} w={64} h={64} fit="contain" radius="sm" />}
      <Stack gap={4}><Text fw={700}>{product.name}</Text>
        <Badge color={product.isVisible ? 'green' : 'gray'} variant="light">{product.isVisible ? 'מוצג באתר' : 'לא מוצג באתר'}</Badge>
        <Text size="sm" c="dimmed">{product.variants.length ? `${product.variants.length} אפשרויות לבחירה` : `${product.pricePerSet === null ? 'מחיר טרם הוגדר' : `₪${product.pricePerSet} ליחידת קנייה`} · ${product.availableSets} במלאי`}</Text>
        {!product.isVisible && <Text size="sm" c="dimmed">{product.visibilityReasons.join(' · ') || 'פתחי את המוצר לבדיקת הפרטים'}</Text>}
      </Stack>
    </Group><Button variant="light" disabled={store.saving} onClick={() => store.editProduct(product)}>עריכת מוצר</Button>
  </Group></Card>;
});
