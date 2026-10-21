import { useState } from 'react';
import { ActionIcon, Badge, Button, Drawer, Group, Image, Stack, Text } from '@mantine/core';
import { IconMenu2, IconShoppingBag } from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';
import { Link, NavLink } from 'react-router-dom';
import { cartStore } from '../../stores/cart.store';

export const SiteHeader = observer(function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = <>
    <Button component={NavLink} to="/" end variant="subtle">דף הבית</Button>
    <Button component={NavLink} to="/catalog" variant="subtle">קטלוג</Button>
    <Button component={Link} to="/#gallery" variant="subtle">גלריה</Button>
    <Button component={Link} to="/cart" variant="subtle">העגלה שלי</Button>
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
