import { useEffect } from 'react';
import { Button, Container, Stack, Title } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { CartItems } from '../features/cart/CartItems';
import { cartStore } from '../stores/cart.store';

export const CartPage = observer(function CartPage() {
  useEffect(() => { void cartStore.refresh(); }, []);
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>העגלה שלך</Title>
        <CartItems />
        {cartStore.items.length > 0 && <Button component={Link} to="/checkout" disabled={!cartStore.canContinue}>להמשך</Button>}
      </Stack>
    </Container>
  );
});

export default CartPage;
