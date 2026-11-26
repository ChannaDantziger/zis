import { useEffect } from 'react';
import { Button, Container, Stack, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { CartItems } from '../features/cart/CartItems';
import { cartStore } from '../stores/cart.store';
import { useMinimumOrderStatus } from '../features/cart/minimum-order';
import { checkoutStore } from '../features/checkout/checkout.store';

export const CartPage = observer(function CartPage() {
  const minimumOrder = useMinimumOrderStatus();
  useEffect(() => { void cartStore.refresh(); }, []);
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>העגלה שלך</Title>
        <CartItems />
        {cartStore.totalSets > 0 && <Button component={Link} to="/checkout" disabled={!cartStore.canContinue || !minimumOrder.isMet}
          onClick={() => checkoutStore.startNewCheckout()}>להמשך</Button>}
      </Stack>
    </Container>
  );
});

export default CartPage;
