import { Select, SimpleGrid, Stack, TextInput, Textarea } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import type { CheckoutStore } from './checkout.store';
import type { CustomerForm } from './checkout.types';
const fields: Array<[keyof CustomerForm, string, boolean, number]> = [
  ['customerName', 'שם מלא', true, 150], ['customerPhone', 'טלפון', true, 20], ['customerEmail', 'דוא״ל', true, 254],
  ['street', 'רחוב', true, 200], ['houseNumber', 'מספר בית', true, 30], ['apartment', 'דירה', false, 30],
  ['postalCode', 'מיקוד', false, 20], ['venueName', 'שם אולם / מקום', false, 200],
];
export const CheckoutForm = observer(function CheckoutForm({ store }: { store: CheckoutStore }) {
  return <Stack>
    <TextInput label="תאריך אספקה" type="date" required value={store.deliveryDate} disabled={store.locked}
      onChange={(event) => store.setDelivery('deliveryDate', event.currentTarget.value)} />
    <Select label="אזור משלוח" required disabled={store.locked} value={store.shippingZoneId || null}
      data={store.zones.map((zone) => ({ value: zone.shippingZoneId, label: zone.name + ' — ' + zone.city
        + (zone.neighborhood ? ' / ' + zone.neighborhood : '') }))}
      onChange={(value) => store.setDelivery('shippingZoneId', value ?? '')} />
    <Select label="שיטת משלוח" required disabled={store.locked} value={store.shippingMethodId || null}
      data={store.methods.map((method) => ({ value: method.shippingMethodId, label: method.name }))}
      onChange={(value) => store.setDelivery('shippingMethodId', value ?? '')} />
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      {fields.map(([field, label, required, maxLength]) => <TextInput key={field} label={label} required={required}
        maxLength={maxLength} disabled={store.locked} value={store.customer[field]}
        type={field === 'customerEmail' ? 'email' : field === 'customerPhone' ? 'tel' : 'text'}
        onChange={(event) => store.setCustomer(field, event.currentTarget.value)} />)}
    </SimpleGrid>
    <Textarea label="הקדשה" maxLength={1000} value={store.customer.dedicationText} disabled={store.locked}
      onChange={(event) => store.setCustomer('dedicationText', event.currentTarget.value)} />
    <Textarea label="הערות למשלוח" maxLength={2000} value={store.customer.customerNotes} disabled={store.locked}
      onChange={(event) => store.setCustomer('customerNotes', event.currentTarget.value)} />
  </Stack>;
});
