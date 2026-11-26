import { useState } from 'react';
import { ActionIcon, Badge, Button, Drawer, Group, Image, Stack, Text } from '@mantine/core';
import { IconMenu2, IconShoppingBag } from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cartStore } from '../../stores/cart.store';
import { checkoutStore } from '../../features/checkout/checkout.store';

export const SiteHeader = observer(function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigation = <>
    <Button component={NavLink} to="/" end variant="subtle">דף הבית</Button>
    <Button component={NavLink} to="/#catalog" variant="subtle">קטלוג</Button>
    <Button component={Link} to="/#gallery" variant="subtle">גלריה</Button>
    <Button component={Link} to="/#faq" variant="subtle">שאלות ותשובות</Button>
    <Button component={Link} to="/checkout" variant="subtle" onClick={() => {
      if (location.pathname !== '/checkout' && cartStore.totalSets > 0) checkoutStore.startNewCheckout();
      cartStore.close();
    }}>ההזמנה שלי</Button>
  </>;
  return <header className="site-header content-width">
    <Link to="/" aria-label="זיס — דף הבית"><Image src="/zis-logo-dark.png" alt="זיס" w={100} h={82} fit="contain" /></Link>
    <Group component="nav" aria-label="ניווט ראשי" visibleFrom="sm" gap="xs">{navigation}</Group>
    <Group gap="xs">
      <ActionIcon size="xl" variant="outline" aria-label={`פתיחת עגלה, ${cartStore.totalSets} יחידות קנייה`} onClick={() => cartStore.open()}>
        <IconShoppingBag size={22} />
      </ActionIcon>
      <Badge aria-label="מספר יחידות קנייה בעגלה" color="chocolate" variant="light">{cartStore.totalSets}</Badge>
      <ActionIcon size="xl" variant="subtle" hiddenFrom="sm" aria-label="פתיחת תפריט" onClick={() => setMenuOpen(true)}><IconMenu2 /></ActionIcon>
    </Group>
    <Drawer opened={menuOpen} onClose={() => setMenuOpen(false)} title={<Text fw={700}>ניווט באתר</Text>} position="right">
      <Stack component="nav" aria-label="ניווט בנייד" onClick={() => setMenuOpen(false)}>{navigation}</Stack>
    </Drawer>
  </header>;
});
