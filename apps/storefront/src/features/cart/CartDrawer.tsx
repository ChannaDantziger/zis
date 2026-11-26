import { useEffect } from 'react';
import { Button, Drawer, Stack } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { cartStore } from '../../stores/cart.store';
import { CartItems } from './CartItems';

export const CartDrawer = observer(function CartDrawer() {
  useEffect(() => { if (cartStore.isOpen) void cartStore.refresh(); }, [cartStore.isOpen]);
  return (
    <Drawer opened={cartStore.isOpen} onClose={cartStore.close} title="העגלה שלך" position="left" size="md" className="cart-drawer">
      <Stack>
        <CartItems />
        {cartStore.totalSets > 0 && <Button component={Link} to="/cart" onClick={cartStore.close}>לצפייה בעגלה</Button>}
      </Stack>
    </Drawer>
  );
});
