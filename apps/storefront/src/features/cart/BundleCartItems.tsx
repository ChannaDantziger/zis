import { useState } from 'react';
import { Alert, Button, Card, Group, Image, NumberInput, Stack, Text } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { BundleModal } from '../bundles/BundleModal';
import { formatBundlePrice, priceAgorot } from '../bundles/allocation';
import { bundleKey, cartStore } from '../../stores/cart.store';
import { MAX_QUANTITY_SETS } from '../../stores/cart.persistence';

export const BundleCartItems = observer(function BundleCartItems() {
  const [editing, setEditing] = useState<string | null>(null);
  const catalog = cartStore.bundleCatalog;
  return <Stack>
    {cartStore.bundleError && <Alert color="orange" role="alert">{cartStore.bundleError}</Alert>}
    {cartStore.bundles.map(line => {
      const key = bundleKey(line), bundle = catalog?.bundles.find(item => item.bundleId === line.bundleId);
      const products = catalog?.products.filter(item => item.categoryId === bundle?.categoryId) ?? [];
      const selection = Object.fromEntries(line.components.map(item => [item.productId, item.quantity]));
      const allAvailable = line.components.every(component => products.some(item => item.productId === component.productId));
      const image = bundle?.images.find(item => item.isPrimary) ?? bundle?.images[0];
      return <Card key={key} withBorder radius={0} p="md"><Stack gap="sm">
        <Group wrap="nowrap" align="start">{image && <Image src={image.url} alt={image.altText} w={72} h={72} fit="contain" />}
          <Stack gap={3}><Text fw={700}>{bundle?.name ?? 'מארז שפרטיו ממתינים לבדיקה'}</Text>
            {bundle && allAvailable && <Text>{formatBundlePrice(priceAgorot(products, selection))} למארז</Text>}
            {line.components.map(component => <Text size="sm" key={component.productId}>
              {products.find(item => item.productId === component.productId)?.name ?? 'מוצר לא זמין'}: {component.quantity} למארז (סה״כ {component.quantity * line.quantity})
            </Text>)}
            {bundle && allAvailable && <Text fw={700}>סה״כ {formatBundlePrice(priceAgorot(products, selection) * BigInt(line.quantity))}</Text>}
            {!allAvailable && <Alert color="orange">אחד ממוצרי המארז אינו זמין; יש לעדכן את הרכב המארז.</Alert>}
          </Stack></Group>
        <Group align="end" justify="space-between"><NumberInput label="מספר מארזים זהים" min={1} max={MAX_QUANTITY_SETS}
          value={line.quantity} allowDecimal={false} allowNegative={false} onChange={value => { if (typeof value === 'number') cartStore.setBundleQuantity(key, value); }} />
          <Button variant="light" disabled={!bundle} onClick={() => setEditing(key)}>עריכת הרכב</Button>
          <Button variant="subtle" color="red" onClick={() => cartStore.removeBundle(key)}>הסרה</Button></Group>
        {editing === key && bundle && <BundleModal bundle={bundle} products={products} initial={selection} initialCount={line.quantity}
          onClose={() => setEditing(null)} onSave={(values, quantity) => {
            const components = Object.entries(values).filter(([, amount]) => amount > 0).map(([productId, amount]) => ({ productId, quantity: amount }));
            return cartStore.replaceBundle(key, { bundleId: line.bundleId, quantity, components }) ? null : cartStore.bundleError || 'לא ניתן לשמור את המארז.';
          }} />}
      </Stack></Card>;
    })}
  </Stack>;
});
