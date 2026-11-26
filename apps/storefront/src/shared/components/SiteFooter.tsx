import { Container, Group, Image, Stack, Text, Anchor } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { cartStore } from '../../stores/cart.store';
import { checkoutStore } from '../../features/checkout/checkout.store';

export function SiteFooter() {
  const location = useLocation();
  return <footer className="site-footer">
    <Container className="content-width">
      <Group justify="space-between" align="start" gap="xl">
        <Image src="/zis-logo-light.png" w={110} h={90} fit="contain" alt="זיס" />
        <Stack gap="sm">
          <Text fw={700}>זיס</Text>
          <Anchor component={Link} to="/" c="inherit">דף הבית</Anchor>
          <Anchor component={Link} to="/#catalog" c="inherit">לקטלוג</Anchor>
          <Anchor component={Link} to="/checkout" c="inherit" onClick={() => {
            if (location.pathname !== '/checkout' && cartStore.totalSets > 0) checkoutStore.startNewCheckout();
            cartStore.close();
          }}>מעבר להזמנה</Anchor>
        </Stack>
        <Text size="sm" maw={340}>דמי המשלוח יחושבו לפי פרטי ההזמנה ויוצגו לפני התשלום.</Text>
      </Group>
    </Container>
  </footer>;
}
