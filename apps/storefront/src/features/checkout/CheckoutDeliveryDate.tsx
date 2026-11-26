import { Select, Stack, Text } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { checkoutStore } from './checkout.store';

export const CheckoutDeliveryDate = observer(function CheckoutDeliveryDate() {
  const store = checkoutStore;
  return <Stack gap="xs">
    <Select label="תאריך אספקה" required value={store.deliveryDate || null} disabled={store.locked || store.datesLoading || !store.availableDates.length}
      placeholder={store.datesLoading ? 'טוען תאריכים…' : 'בחרו תאריך זמין'}
      data={store.availableDates.map(date => ({ value: date, label: date.split('-').reverse().join('/') }))}
      onChange={value => store.setDelivery('deliveryDate', value ?? '')} />
    {store.datesError && <Text c="red" role="alert">{store.datesError}</Text>}
    {!store.datesLoading && !store.datesError && !store.availableDates.length && <Text c="red" role="alert">אין כרגע תאריכי אספקה זמינים. אי אפשר להמשיך בהזמנה.</Text>}
    {!store.datesLoading && !store.datesError && store.availableDates.length > 0 && !store.deliveryDate && <Text c="dimmed" role="status">בחרו תאריך אספקה כדי להמשיך.</Text>}
  </Stack>;
});
