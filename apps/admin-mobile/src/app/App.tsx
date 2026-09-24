import { AppShell, Badge, Group, NavLink, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBox, IconChecklist, IconHome, IconTruck } from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage.js';
import { OrdersPage } from '../pages/OrdersPage.js';
import { ProductionPage } from '../pages/ProductionPage.js';

const navigation = [
  { label: 'מסלול היום', to: '/', icon: IconHome },
  { label: 'הזמנות', to: '/orders', icon: IconChecklist },
  { label: 'ייצור', to: '/production', icon: IconBox },
];

export function App() {
  const location = useLocation();
  return (
    <AppShell header={{ height: 72 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header className="app-header">
        <Group justify="space-between" h="100%" px="md">
          <Group gap="xs"><ThemeIcon color="orange" variant="light" radius="xl"><IconTruck size={18} /></ThemeIcon><Title order={3}>ZIS תפעול</Title></Group>
          <Badge color="teal" variant="light">ניהול</Badge>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm"><Stack gap={4}>{navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} component={Link} to={to} label={label} leftSection={<Icon size={18} />} active={location.pathname === to} />)}</Stack></AppShell.Navbar>
      <AppShell.Main><Outlet /></AppShell.Main>
    </AppShell>
  );
}

export function AppRoutes() {
  return <Routes><Route element={<App />}><Route path="/" element={<DashboardPage />} /><Route path="/orders" element={<OrdersPage />} /><Route path="/production" element={<ProductionPage />} /></Route></Routes>;
}
