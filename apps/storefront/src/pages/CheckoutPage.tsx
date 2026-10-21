import { useEffect } from 'react';
import { Alert, Button, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import { Link } from 'react-router-dom';
import { CartItems } from '../features/cart/CartItems';
import { cartStore } from '../stores/cart.store';
import { checkoutStore } from '../features/checkout/checkout.store';
import { CheckoutForm } from '../features/checkout/CheckoutForm';

export const CheckoutPage = observer(function CheckoutPage() {
  const store = checkoutStore;
  useEffect(() => {
    void cartStore.refresh(); if (!store.retryPending && !store.created) void store.load();
    const stop = reaction(() => JSON.stringify(cartStore.items), () => {
      if (!store.retryPending && !store.created) store.invalidateQuote();
    });
    const warn = (event: BeforeUnloadEvent) => { if (store.retryPending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { stop(); window.removeEventListener('beforeunload', warn); store.leave(); };
  }, [store]);
  if (store.created) {
    const result = store.confirmation ?? store.created;
    return <Container size="sm" py="xl"><Stack>
      <Title order={1}>הזמנה {result.orderNumber}</Title>
      <Alert color="yellow" title="ההזמנה נשמרה — התשלום עדיין לא זמין" role="status">
        לא בוצע חיוב. ההזמנה אינה אישור תשלום ואינה מבטיחה מלאי. הפריטים נשארים בעגלה.
      </Alert>
      <Text>סכום שנשמר בהזמנה: {result.total} ₪</Text>
      <Text>מצב תשלום: {result.paymentStatus === 'pending' ? 'ממתין לתשלום' : result.paymentStatus}</Text>
      {store.confirmation && <Text>תאריך אספקה: {store.confirmation.deliveryDate}</Text>}
      {store.confirmationError && <Alert color="orange">{store.confirmationError}</Alert>}
      <Button variant="light" disabled={!store.hasPrivateConfirmation} onClick={() => void store.refreshConfirmation()}>רענון האישור הפרטי</Button>
      <Text size="sm" c="dimmed">האישור זמין בדף זה בלבד. אין ליצור שוב את אותה הזמנה מהעגלה.</Text>
      <Button component={Link} to="/catalog" variant="subtle">חזרה לקטלוג</Button>
    </Stack></Container>;
  }
  return <Container size="sm" py="xl"><Stack gap="lg">
    <Title order={1}>פרטי ההזמנה</Title>
    <Alert color="yellow" title="תשלום עדיין אינו זמין">
      ניתן ליצור הזמנה ממתינה בלבד. לא מתבצע חיוב ולא נשמרים פרטי כרטיס.
    </Alert>
    {store.loading && <Loader aria-label="טוען אפשרויות משלוח" />}
    {store.error && <Alert color="red" role="alert">{store.error}</Alert>}
    {!store.status && !store.loading && <Button onClick={() => void store.load()}>טעינת אפשרויות מחדש</Button>}
    {store.status && !store.status.storeOpen && <Alert color="orange" title="החנות סגורה להזמנות">
      {store.status.lockMessage || 'לא ניתן ליצור הזמנה כרגע.'}
    </Alert>}
    {store.status?.storeOpen && (!store.zones.length || !store.methods.length) &&
      <Alert color="orange">לא הוגדרו אפשרויות משלוח זמינות. יצירת הזמנה חסומה.</Alert>}
    <CartItems />
    {!cartStore.items.length && <Text>העגלה ריקה. בחרו מוצרים מהקטלוג.</Text>}
    <CheckoutForm store={store} />
    {store.status?.dispatchTime && <Text size="sm">שעת יציאה למשלוחים: {store.status.dispatchTime}</Text>}
    <Text size="sm" c="dimmed">השרת בודק תאריך, ימי עבודה, שעת חיתוך, סגירות ומינימום סכום מוצרים (ללא דמי משלוח). אין שריון מלאי.</Text>
    <Button disabled={!store.canQuote || !cartStore.canContinue} loading={store.busy && !store.retryPending}
      onClick={() => void store.preview(cartStore.items)}>בדיקת מחיר ומשלוח</Button>
    {store.quote && <Stack gap="xs">
      <Text>מוצרים: {store.quote.subtotal} ₪</Text><Text>משלוח: {store.quote.shippingTotal} ₪</Text>
      <Text fw={700}>סך הכול לפי החישוב הנוכחי: {store.quote.total} ₪</Text>
      {store.quote.warnings.map((warning, index) => <Text key={index}>{warning}</Text>)}
      <Text size="sm">המחיר והזמינות נבדקים שוב בעת שמירת ההזמנה.</Text>
    </Stack>}
    {store.retryPending && <Alert color="orange">בקשת ההזמנה נעולה לניסיון חוזר עם אותם פרטים.
      הישארו בדף עד קבלת תשובה; רענון או יציאה יבטלו את האפשרות לניסיון חוזר בטוח כאן.</Alert>}
    <Group grow>
      <Button disabled={store.retryPending ? store.busy : !store.canCreate || !cartStore.canContinue}
        loading={store.busy && store.retryPending} onClick={() => void store.submit(cartStore.items)}>
        {store.retryPending ? 'בדיקה חוזרת של אותה הזמנה' : 'יצירת הזמנה ממתינה'}
      </Button>
      <Button component={Link} to="/cart" variant="light" disabled={store.locked}>חזרה לעגלה</Button>
    </Group>
    <Text size="sm" c="dimmed">פרטי הלקוחה והאישור הפרטי נשמרים בזיכרון הדף בלבד.</Text>
  </Stack></Container>;
});
export default CheckoutPage;
