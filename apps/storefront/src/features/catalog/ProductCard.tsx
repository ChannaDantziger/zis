import { useState } from 'react';
import { Alert, AspectRatio, Badge, Button, Card, Group, NumberInput, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { CatalogProduct } from '../../entities/product/types';
import { formatPurchasePrice } from '../../entities/product/format';
import { useStoreStatus } from '../../shared/store-status';
import { cartStore } from '../../stores/cart.store';
import { SafeImage } from '../product-gallery/SafeImage';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const [quantitySets, setQuantitySets] = useState(1);
  const [notice, setNotice] = useState('');
  const storeStatus = useStoreStatus();
  const simpleProduct = product.variants.length === 0;
  const availableSets = product.availableSets;
  const purchasePrice = simpleProduct ? formatPurchasePrice(product.pricePerUnit, product.setSize, quantitySets) : null;
  const validQuantity = simpleProduct && Number.isInteger(quantitySets) && quantitySets >= 1 && quantitySets <= availableSets;

  const addToCart = () => {
    if (!validQuantity || storeStatus.data?.storeOpen !== true) return;
    if (!cartStore.addItem(product, quantitySets)) {
      setNotice('לא ניתן להוסיף את מספר יחידות הקנייה המבוקש. בדקו את הכמות שכבר נמצאת בעגלה.');
      return;
    }
    setNotice('');
    cartStore.open();
  };

  return <Card className="product-card" withBorder p="md" h="100%">
    <Link to={`/products/${product.productId}`} aria-label={`${product.name}, פרטים מלאים`} className="product-card-link">
      <AspectRatio ratio={4 / 3}>
        {product.primaryImage ? <SafeImage src={product.primaryImage.url} alt={product.primaryImage.altText || product.name} fit="cover" />
          : <Text c="dimmed" ta="center">תמונה תתווסף בהמשך</Text>}
      </AspectRatio>
    </Link>
    <Stack gap="xs" mt="md" flex={1}>
      <Text size="xs" c="dimmed">{product.category.name}</Text>
      <Title order={3} size="h4"><Link to={`/products/${product.productId}`} className="product-card-link">{product.name}</Link></Title>
      <Text size="sm" lineClamp={2}>{product.description || 'לפרטים נוספים על המוצר'}</Text>
      {simpleProduct && <Text size="sm" c="dimmed">מגיע {product.setSize} יחידות בסט</Text>}
      {simpleProduct ? <>
      <Group justify="space-between"><Text size="sm">{purchasePrice?.setDetail}</Text>
        {availableSets < 1 && <Badge color="gray" variant="light">לא זמין כרגע</Badge>}</Group>
      <Group align="end" justify="space-between" wrap="nowrap" mt="auto">
      <NumberInput w={110} label="כמות סטים" aria-label={`מספר סטים עבור ${product.name}`} min={1} max={Math.max(1, availableSets)}
        allowDecimal={false} allowNegative={false} value={quantitySets}
        disabled={availableSets < 1} onChange={(value) => setQuantitySets(typeof value === 'number' ? value : 0)} />
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Text fw={700} aria-live="polite">סה״כ: {purchasePrice?.total}</Text><Text size="xs" c="dimmed">{purchasePrice?.detail}</Text>
        <Button size="sm" disabled={!validQuantity || storeStatus.data?.storeOpen !== true} onClick={addToCart}>הוסף לסל</Button>
      </Stack>
      </Group>
      </> : <Text size="sm" c="dimmed">המוצר אינו זמין כרגע לרכישה.</Text>}
      <Button component={Link} to={`/products/${product.productId}`} variant="subtle">פרטים מלאים</Button>
      {notice && <Alert color="orange" role="alert">{notice}</Alert>}
    </Stack>
  </Card>;
}
