import { useEffect, useState } from 'react';
import { Alert, Button, Container, Group, Loader, Stack, Stepper, Text, Textarea, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { CartItems } from '../features/cart/CartItems';
import { useMinimumOrderStatus } from '../features/cart/minimum-order';
import { cartStore } from '../stores/cart.store';
import { checkoutStore } from '../features/checkout/checkout.store';
import { CheckoutForm } from '../features/checkout/CheckoutForm';
import { CheckoutDeliveryDate } from '../features/checkout/CheckoutDeliveryDate';
import { TestCheckoutAccess } from '../features/checkout/TestCheckoutAccess';
import { DemoCredit } from '../features/checkout/DemoCredit';
import { CheckoutConfirmation } from '../features/checkout/CheckoutConfirmation';
const QUOTE_DELAY_MS = 400;
const checkoutSteps = ['מוצרים', 'משלוח', 'הקדשה', 'אשראי', 'סיום'];
const nextStepLabels = ['להזנת פרטי משלוח', 'להוספת הקדשה', 'לפרטי תשלום', 'לסיכום ההזמנה'];

export const CheckoutPage = observer(function CheckoutPage() {
  const store = checkoutStore;
  const minimumOrder = useMinimumOrderStatus();
  const [step, setStep] = useState(0);
  useEffect(() => {
    void cartStore.refresh(); if (!store.retryPending && !store.created) void store.load();
    let quoteTimer: ReturnType<typeof setTimeout>;
    const stopQuote = reaction(() => JSON.stringify([store.shippingZoneId, store.deliveryDate, store.status?.storeOpen, cartStore.items, cartStore.bundles, cartStore.canContinue]), () => {
      clearTimeout(quoteTimer);
      if (!store.retryPending && !store.created) {
        store.invalidateQuote();
        quoteTimer = setTimeout(() => { if (cartStore.canContinue) void store.preview(cartStore.items); }, QUOTE_DELAY_MS);
      }
    }, { fireImmediately: true });
    const stop = reaction(() => JSON.stringify([cartStore.items, cartStore.bundles]), () => {
      if (!store.retryPending && !store.created) store.invalidateQuote();
    });
    const warn = (event: BeforeUnloadEvent) => { if (store.retryPending || store.pendingUpdatePending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { clearTimeout(quoteTimer); stopQuote(); stop(); window.removeEventListener('beforeunload', warn); store.leave(); };
  }, [store]);
  if (store.created) return <CheckoutConfirmation />;
  return <Container size="sm" py="xl"><Stack gap="lg">
    <Title order={1}>פרטי ההזמנה</Title>
    <TestCheckoutAccess />
    <Alert color="yellow" title="תשלום עדיין אינו זמין">
      ניתן ליצור הזמנה ממתינה בלבד. לא מתבצע חיוב ולא נשמרים פרטי כרטיס.
    </Alert>
    {store.loading && <Loader aria-label="טוען אפשרויות משלוח" />}
    {store.error && <Alert color="red" role="alert">{store.error}</Alert>}
    {!store.status && !store.loading && <Button onClick={() => void store.load()}>טעינת אפשרויות מחדש</Button>}
    {store.status && !store.status.storeOpen && <Alert color="orange" title="החנות סגורה להזמנות">
      {store.status.lockMessage || 'לא ניתן ליצור הזמנה כרגע.'}
    </Alert>}
    {store.status?.storeOpen && !store.zones.length &&
      <Alert color="orange">לא הוגדרו אפשרויות משלוח זמינות. יצירת הזמנה חסומה.</Alert>}
    <Stepper active={step} onStepClick={(value) => { if (!store.locked && value < step) setStep(value); }} size="xs" aria-label="שלבי ההזמנה">
      {checkoutSteps.map((label) => <Stepper.Step key={label} label={label} />)}
    </Stepper>
    {step === 0 && <><CheckoutDeliveryDate /><CartItems /></>}
    {!cartStore.items.length && !cartStore.bundles.length && <Text>העגלה ריקה. בחרו מוצרים מהקטלוג.</Text>}
    {step === 1 && <CheckoutForm store={store} />}
    {step === 2 && <Textarea label="הקדשה (רשות)" maxLength={1000} value={store.customer.dedicationText}
      onChange={(event) => store.setCustomer('dedicationText', event.currentTarget.value)} />}
    {step === 3 && <DemoCredit />}
    {step === 4 && <Text>בדקו את הסכום ואשרו את ההזמנה. ההזמנה תישמר כממתינה לתשלום.</Text>}
    {store.status?.dispatchTime && <Text size="sm">שעת יציאה למשלוחים: {store.status.dispatchTime}</Text>}
    <Text size="sm" c="dimmed">השרת בודק תאריך, ימי עבודה, שעת חיתוך, סגירות ומינימום סכום מוצרים (ללא דמי משלוח). אין שריון מלאי.</Text>
    {store.quote && <Stack gap="xs">
      <Text>מוצרים: {store.quote.subtotal} ₪</Text><Text>משלוח: {store.quote.shippingTotal} ₪</Text>
      <Text fw={700}>סך הכול לפי החישוב הנוכחי: {store.quote.total} ₪</Text>
      {store.quote.warnings.map((warning, index) => <Text key={index}>{warning}</Text>)}
      <Text size="sm">המלאי נבדק לפני התשלום. הזמנה ממתינה אינה שומרת מלאי.</Text>
    </Stack>}
    {store.retryPending && <Alert color="orange">בקשת ההזמנה נעולה לניסיון חוזר עם אותם פרטים.
      הישארו בדף עד קבלת תשובה; רענון או יציאה יבטלו את האפשרות לניסיון חוזר בטוח כאן.</Alert>}
    <Group grow>
      <Button component={Link} to="/catalog" variant="light" disabled={store.locked}>המשך קנייה</Button>
      <Button rightSection={<IconArrowLeft size={18} aria-hidden="true" />} disabled={store.retryPending ? store.busy : !minimumOrder.isMet || (step === 0 ? !cartStore.canContinue || !store.hasValidDeliveryDate : step === 1 || step === 4 ? !store.canContinueDelivery(cartStore.items) || !cartStore.canContinue : store.locked)}
        loading={store.busy && store.retryPending} onClick={() => {
          if (store.retryPending || step === 4) void store.submit(cartStore.items);
          else setStep((value) => value + 1);
        }}>
        {store.retryPending ? 'בדיקת ההזמנה מחדש' : step === 4 ? (store.testAuthorized ? 'אישור הזמנת ניסוי' : 'אישור ההזמנה') : nextStepLabels[step]}
      </Button>
    </Group>
    <Text size="sm" c="dimmed">פרטי הלקוחה והאישור הפרטי נשמרים בזיכרון הדף בלבד.</Text>
  </Stack></Container>;
});
export default CheckoutPage;
