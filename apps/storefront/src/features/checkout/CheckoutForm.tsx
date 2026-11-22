import { Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import type { CheckoutStore } from './checkout.store';
import type { CustomerForm } from './checkout.types';
const fields: Array<[keyof CustomerForm, string, boolean, number]> = [
  ['customerName', 'שם מלא', true, 150], ['customerPhone', 'טלפון המזמין', true, 20], ['deliveryPhone', 'טלפון זמין לקבלת המשלוח', true, 20], ['customerEmail', 'דוא״ל', true, 254],
  ['street', 'רחוב', true, 200], ['houseNumber', 'מספר בית', true, 30], ['apartment', 'דירה', false, 30],
  ['postalCode', 'מיקוד', false, 20], ['venueName', 'שם אולם / מקום', false, 200],
];
export const CheckoutForm = observer(function CheckoutForm({ store }: { store: CheckoutStore }) {
  return <Stack>
    <Select label="אזור משלוח" required disabled={store.locked} value={store.shippingZoneId || null}
      data={store.zones.map((zone) => ({ value: zone.shippingZoneId, label: zone.name + ' — ' + zone.city
        + (zone.neighborhood ? ' / ' + zone.neighborhood : '') }))}
      onChange={(value) => store.setDelivery('shippingZoneId', value ?? '')} />
    <Select label="תאריך אספקה" required value={store.deliveryDate || null} disabled={store.locked || store.datesLoading || !store.availableDates.length}
      placeholder={store.datesLoading ? 'טוען תאריכים…' : 'בחרו תאריך זמין'}
      data={store.availableDates.map((date) => ({ value: date, label: date.split('-').reverse().join('/') }))}
      onChange={(value) => store.setDelivery('deliveryDate', value ?? '')} />
    {store.datesError && <Text c="red" role="alert">{store.datesError}</Text>}
    {!store.datesLoading && !store.datesError && !store.availableDates.length && <Text c="red" role="alert">אין כרגע תאריכי אספקה זמינים. אי אפשר להמשיך בהזמנה.</Text>}
    {!store.datesLoading && !store.datesError && store.availableDates.length > 0 && !store.deliveryDate && <Text c="dimmed" role="status">בחרו תאריך אספקה כדי להמשיך.</Text>}
    <Text size="sm" aria-live="polite">{store.quote ? `עלות משלוח: ${store.quote.shippingTotal} ₪` : store.busy ? 'מחשב עלות משלוח…' : 'עלות המשלוח תוצג לאחר בחירת אזור ותאריך תקינים'}</Text>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      {fields.map(([field, label, required, maxLength]) => <TextInput key={field} label={label} required={required}
        maxLength={maxLength} disabled={store.locked} value={store.customer[field]}
        description={field === 'customerEmail' ? 'לקבלת חשבונית ועדכונים' : undefined}
        error={store.customer[field] ? store.validationErrors[field as keyof typeof store.validationErrors] : undefined}
        type={field === 'customerEmail' ? 'email' : field.endsWith('Phone') ? 'tel' : 'text'}
        onChange={(event) => store.setCustomer(field, event.currentTarget.value)} />)}
    </SimpleGrid>
    <Textarea label="הערות למשלוח" description="המשלוחן יכול להתבלבל? מקום מסובך? יש 2 כניסות? רשמו הכל שתוכלו לקבל את המשלוח בנחת"
      maxLength={2000} value={store.customer.customerNotes} disabled={store.locked}
      onChange={(event) => store.setCustomer('customerNotes', event.currentTarget.value)} />
  </Stack>;
});
