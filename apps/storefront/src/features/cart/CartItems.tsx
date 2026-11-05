import { Alert, Button, Card, Group, Image, NumberInput, Stack, Text } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { cartStore } from '../../stores/cart.store';
import { MAX_QUANTITY_SETS } from '../../stores/cart.persistence';
import { cartKey, OUT_OF_STOCK_MESSAGE } from '../../stores/cart.store';
import { formatPurchasePrice } from '../../entities/product/format';
import { MinimumOrderNotice } from './minimum-order';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export const CartItems = observer(function CartItems() {
  if (!cartStore.items.length) {
    return <Stack align="center" py="xl"><Text>העגלה שלך עדיין ריקה</Text><Button component={Link} to="/catalog" onClick={cartStore.close}>לבחירת מוצרים</Button></Stack>;
  }
  return (
    <Stack>
      {cartStore.storageNotice && <Alert color="yellow" role="status">{cartStore.storageNotice}</Alert>}
      {cartStore.refreshError && <Alert color="red" role="alert">{cartStore.refreshError}</Alert>}
      {cartStore.items.map((item) => {
        const key = cartKey(item);
        const details = cartStore.details.get(key);
        const missing = cartStore.missing.has(key);
        const quantityInvalid = details && item.quantitySets > (details.variant?.availableSets ?? details.product.availableSets);
        const image = details?.variant?.primaryImage ?? details?.product.primaryImage;
        const purchasePrice = details ? formatPurchasePrice(details.variant?.pricePerUnit ?? details.product.pricePerUnit, details.product.setSize, item.quantitySets) : null;
        return (
          <Card key={key} withBorder radius={0} p="md" className="cart-line">
            <Stack gap="sm">
              <Group wrap="nowrap" align="start">
                {image && <Image src={image.url} alt={image.altText} w={72} h={72} fit="contain" style={{ borderRadius: '0 0 0 var(--mantine-radius-sm)' }} />}
                <Stack gap={4} style={{ flex: 1 }}>
                  {details ? <>
                    <Text component={Link} to={`/products/${item.productId}`} fw={700} onClick={cartStore.close}>{details.product.name}</Text>
                    {details.variant && <Text size="sm">{details.variant.name}</Text>}
                    <Text size="sm" c="dimmed">{item.quantitySets} יחידות קנייה × {details.product.setSize} יח׳ בכל יחידה</Text>
                    <Text size="sm">{purchasePrice?.setDetail}</Text>
                    <Text fw={700}>{purchasePrice?.total ?? 'ממתין למחיר'} <Text span size="sm" fw={400}>({purchasePrice?.detail})</Text></Text>
                  </> : missing ? <Alert color="yellow" role="alert">{OUT_OF_STOCK_MESSAGE}
                    <Button component={Link} to="/catalog" variant="subtle" onClick={cartStore.close}>לבחירת מוצר אחר מהקטלוג</Button>
                  </Alert> : <Text>פרטי המוצר ממתינים לבדיקה</Text>}
                </Stack>
              </Group>
              {quantityInvalid && <Alert color="yellow" role="alert">{OUT_OF_STOCK_MESSAGE}
                <Button component={Link} to={`/catalog?categorySlug=${encodeURIComponent(details.product.category.slug)}`} variant="subtle" onClick={cartStore.close}>למוצרים מאותה קטגוריה</Button>
              </Alert>}
              <Group justify="space-between" align="end">
                <NumberInput
                  label="מספר יחידות קנייה" aria-label={`כמות יחידות קנייה עבור ${details?.product.name ?? 'מוצר בעגלה'} ${details?.variant?.name ?? ''}`}
                  value={item.quantitySets} min={1} max={MAX_QUANTITY_SETS} allowDecimal={false} allowNegative={false}
                  w={130}
                  onChange={(value) => { if (typeof value === 'number') cartStore.setQuantity(key, value); }}
                />
                <Button variant="subtle" color="red" onClick={() => cartStore.removeItem(key)} aria-label={`הסרת ${details?.product.name ?? 'מוצר'} מהעגלה`}>הסרה</Button>
              </Group>
            </Stack>
          </Card>
        );
      })}
      {cartStore.refreshError && <Button variant="light" loading={cartStore.isRefreshing} onClick={() => void cartStore.refresh()}>ניסיון נוסף</Button>}
      <Group justify="space-between"><Text fw={700}>סך מוצרי העגלה</Text><Text fw={700}>{cartStore.subtotalAgorot === null ? 'ממתין לבדיקת מחיר' : currency.format(cartStore.subtotalAgorot / 100)}</Text></Group>
      <MinimumOrderNotice />
      <Text size="sm" c="dimmed">הסכום אינו כולל משלוח.</Text>
    </Stack>
  );
});
