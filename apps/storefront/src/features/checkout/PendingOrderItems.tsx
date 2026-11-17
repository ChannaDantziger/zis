import { Alert, Button, Card, Group, NumberInput, Stack, Text, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { cartKey, cartStore, OUT_OF_STOCK_MESSAGE } from '../../stores/cart.store';
import { MAX_CART_LINES, MAX_QUANTITY_SETS } from '../../stores/cart.persistence';
import { checkoutStore } from './checkout.store';

export const PendingOrderItems = observer(function PendingOrderItems() {
  const store = checkoutStore;
  if (!store.hasPrivateConfirmation || !store.pendingItems.length || store.created?.paymentStatus !== 'pending') return null;
  const pendingKeys = new Set(store.pendingItems.map(cartKey));
  const additions = cartStore.items.filter(item => !pendingKeys.has(cartKey(item)) && !store.pendingCartKeys.has(cartKey(item)));
  const categories = [...new Map(store.pendingItems.flatMap(item => {
    const category = cartStore.details.get(cartKey(item))?.product.category;
    return category ? [[category.slug, category] as const] : [];
  })).values()];
  return <Stack gap="sm">
    <Title order={2} size="h4">עריכת המוצרים לפני תשלום</Title>
    <Text size="sm">אפשר לשנות כמות, להסיר פריט או לבחור חלופה. הזמנה ממתינה אינה שומרת מלאי; הפריטים והזמינות ייבדקו בשמירת השינוי ושוב לפני התשלום.</Text>
    {store.pendingConflict && <Alert color="orange" role="alert">
      ההזמנה השתנתה במקביל. טעינת הפרטים העדכניים תחליף את השינויים המקומיים שלא נשמרו.
      <Button mt="sm" loading={store.busy} disabled={store.busy || store.pendingUpdatePending}
        onClick={() => void store.reloadPendingItems()}>טעינת פרטי ההזמנה העדכניים</Button>
    </Alert>}
    {store.confirmationError === OUT_OF_STOCK_MESSAGE && categories.length > 0 && <Group>
      {categories.map(category => <Button key={category.slug} component={Link} to={`/catalog?categorySlug=${encodeURIComponent(category.slug)}`}
        variant="light" disabled={!store.canEditPending}>לבחירת חלופה מתוך {category.name}</Button>)}
    </Group>}
    {store.pendingItems.map(item => {
      const key = cartKey(item);
      const details = cartStore.details.get(key);
      return <Card key={key} withBorder p="sm">
        <Stack gap="xs">
          <Text fw={600}>{details?.product.name ?? 'מוצר בהזמנה'}</Text>
          <NumberInput label="כמות" aria-label={`כמות ${details?.product.name ?? 'מוצר בהזמנה'}`}
            min={1} max={MAX_QUANTITY_SETS} allowDecimal={false} allowNegative={false} value={item.quantitySets}
            disabled={!store.canEditPending} onChange={value => { if (typeof value === 'number') store.setPendingQuantity(key, value); }} />
          <Button variant="subtle" color="red" disabled={!store.canEditPending || store.pendingItems.length <= 1}
            onClick={() => store.removePendingItem(key)}>הסרה מההזמנה</Button>
        </Stack>
      </Card>;
    })}
    <Text size="sm">כדי להחליף את הפריט היחיד בהזמנה, הוסיפו קודם חלופה ואז הסירו אותו. ההזמנה חייבת להכיל לפחות פריט אחד.</Text>
    {store.removedPendingItems.length > 0 && <Stack gap="xs">
      <Title order={3} size="h5">פריטים שהסרתם מההזמנה</Title>
      {store.removedPendingItems.map(item => {
        const key = cartKey(item);
        const details = cartStore.details.get(key);
        return <Group key={key} justify="space-between">
          <Text size="sm">{details?.product.name ?? 'פריט שהוסר'}</Text>
          <Button variant="subtle" disabled={!store.canEditPending || store.pendingItems.length >= MAX_CART_LINES}
            onClick={() => store.addPendingItem(item)}>החזרה להזמנה</Button>
        </Group>;
      })}
    </Stack>}
    <Button component={Link} to="/catalog" variant="light" disabled={!store.canEditPending}>לבחירת מוצרים נוספים מהקטלוג</Button>
    <Text size="sm">הוסיפו מוצרים לסל וחזרו לעריכת ההזמנה דרך העגלה. כאן בוחרים אילו פריטים להעביר להזמנה; הסל המקומי אינו משנה אותה אוטומטית.</Text>
    {additions.length > 0 && <Stack gap="xs">
      <Title order={3} size="h5">פריטים מהעגלה שאינם בהזמנה</Title>
      {additions.map(item => {
        const key = cartKey(item);
        const details = cartStore.details.get(key);
        return <Group key={key} justify="space-between">
          <Text size="sm">{details?.product.name ?? 'מוצר בעגלה'} ({item.quantitySets} יחידות)</Text>
          <Button variant="light" disabled={!store.canEditPending || !details || cartStore.missing.has(key) || store.pendingItems.length >= MAX_CART_LINES}
            onClick={() => store.addPendingItem(item)}>הוספה להזמנה</Button>
        </Group>;
      })}
    </Stack>}
    {(store.pendingItemsChanged || store.pendingUpdatePending) && <Alert color="orange" role="status">
      יש לשמור את שינויי המוצרים לפני התשלום. הסכום הסופי יופיע לאחר השמירה.
    </Alert>}
    <Group>
      <Button loading={store.busy} disabled={store.busy || store.pendingConflict || (!store.pendingItemsChanged && !store.pendingUpdatePending)} onClick={() => void store.savePendingItems()}>
        {store.pendingUpdatePending ? 'ניסיון נוסף לשמירת אותה בקשה' : 'שמירת המוצרים המעודכנים'}
      </Button>
    </Group>
  </Stack>;
});
