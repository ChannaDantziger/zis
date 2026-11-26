import { Alert, Button, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { BundleCount } from '../bundles/BundleCount';
import { checkoutStore } from './checkout.store';

export const CheckoutConfirmation = observer(function CheckoutConfirmation() {
  const store = checkoutStore;
  if (!store.created) return null;
  const details = store.confirmation;
  const result = details ?? store.created;
  const paid = store.simulatedPaid || store.created.paymentStatus === 'paid' || details?.paymentStatus === 'paid';
  const address = details?.deliveryAddress;
  const payment = paid ? (details?.isTest || store.simulatedPaid ? 'תשלום ניסיוני אושר — ללא חיוב' : 'שולם')
    : result.paymentStatus === 'pending' ? 'ממתין לתשלום' : result.paymentStatus;
  return <Container size="sm" py="xl"><Stack gap="lg">
    <Text>תודה שהזמנתם זיס<br />ושנפגש בשמחות</Text><Text>צוות זיס</Text>
    <Button component={Link} to="/" onClick={() => store.dispose()}>להזמנות נוספות</Button>
    <Title order={1}>הזמנה {result.orderNumber}</Title>
    <Paper withBorder radius="md" p="md"><Stack gap="sm"><Title order={2} size="h4">פרטי ההזמנה</Title>
      {details?.bundles?.map(bundle => <Stack key={bundle.orderBundleId} gap={2}>
        <Group justify="space-between"><div><Text fw={700}>{bundle.bundleName}</Text><BundleCount quantity={bundle.quantity} /></div><Text>{bundle.lineTotal} ₪</Text></Group>
        {bundle.components.map(component => <Text key={component.productId} size="sm">{component.productName}: {component.quantity} למארז (סה״כ {component.quantity * bundle.quantity} יחידות)</Text>)}
      </Stack>)}
      {Boolean(details?.bundles?.length && details.items?.length) && <Text fw={700}>מוצרים</Text>}
      {details?.items?.map((item, index) => <Group key={`${item.productId}-${index}`} justify="space-between">
        <Text>{item.productName ?? 'מוצר בהזמנה'} · כמות: {item.quantitySets}</Text>{item.lineTotal && <Text>{item.lineTotal} ₪</Text>}
      </Group>)}
    </Stack></Paper>
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Paper withBorder radius="md" p="md"><Stack gap="xs"><Title order={2} size="h4">פרטי קשר</Title>
        {details?.customer ? <><Text>{details.customer.name}</Text><Text>טלפון המזמין: <span dir="ltr">{details.customer.phone}</span></Text>
          <Text>טלפון לקבלת המשלוח: <span dir="ltr">{details.customer.deliveryPhone}</span></Text><Text style={{ overflowWrap: 'anywhere' }}>{details.customer.email}</Text></>
          : <Text c="dimmed">פרטי הקשר טרם נטענו.</Text>}
      </Stack></Paper>
      <Paper withBorder radius="md" p="md"><Stack gap="xs"><Title order={2} size="h4">פרטי משלוח</Title>
        <Text>תאריך אספקה: {details?.deliveryDate || store.deliveryDate || 'ממתין לטעינה'}</Text>
        {address ? <><Text>{[address.city, address.neighborhood].filter(Boolean).join(', ')}</Text><Text>{address.street} {address.houseNumber}</Text>
          {address.apartment && <Text>דירה: {address.apartment}</Text>}{address.postalCode && <Text>מיקוד: {address.postalCode}</Text>}
          {details?.venueName && <Text>אולם / מקום: {details.venueName}</Text>}</> : <Text c="dimmed">כתובת המשלוח טרם נטענה.</Text>}
      </Stack></Paper>
    </SimpleGrid>
    {(details?.dedicationText || details?.customerNotes) && <Paper withBorder radius="md" p="md"><Stack gap="xs"><Title order={2} size="h4">הקדשה והערות</Title>
      {details.dedicationText && <Text style={{ whiteSpace: 'pre-wrap' }}>הקדשה: {details.dedicationText}</Text>}
      {details.customerNotes && <Text style={{ whiteSpace: 'pre-wrap' }}>הערות למשלוח: {details.customerNotes}</Text>}
    </Stack></Paper>}
    <Paper withBorder radius="md" p="md"><Stack gap="xs"><Title order={2} size="h4">סיכום תשלום</Title>
      <Group justify="space-between"><Text>מוצרים</Text><Text>{details?.subtotal !== undefined ? `${details.subtotal} ₪` : 'ממתין לפירוט'}</Text></Group>
      <Group justify="space-between"><Text>דמי משלוח</Text><Text>{details?.shippingTotal !== undefined ? `${details.shippingTotal} ₪` : 'ממתין לפירוט'}</Text></Group>
      <Group justify="space-between"><Text fw={700}>סך הכול</Text><Text fw={700}>{result.total} ₪</Text></Group><Text>מצב תשלום: {payment}</Text>
    </Stack></Paper>
    {store.confirmationError && <Alert color="orange" role="alert">לא ניתן לטעון את כל פרטי ההזמנה כרגע. <Button variant="subtle" onClick={() => void store.refreshConfirmation()}>נסו שוב</Button></Alert>}
  </Stack></Container>;
});
