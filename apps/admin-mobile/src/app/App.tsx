import { AppShell, Badge, Burger, Button, Divider, Group, NavLink, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { IconBell, IconBox, IconChecklist, IconHome, IconSettings, IconTruck, IconPhoto } from '@tabler/icons-react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage.js';
import { OrdersPage } from '../pages/OrdersPage.js';
import { OrderDetailsPage } from '../pages/OrderDetailsPage.js';
import { TasksPage } from '../pages/TasksPage.js';
import { ProductionPage } from '../pages/ProductionPage.js';
import { PackingReportPage, DeliveryReportPage } from '../pages/OperationsReportPage.js';
import { ProductionPrintPage } from '../pages/ProductionPrintPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';
import { NotificationsPage } from '../pages/NotificationsPage.js';
import { InventoryPage } from '../pages/InventoryPage.js';
import { CatalogPage } from '../pages/CatalogPage.js';
import { GalleryEditor } from '../features/catalog/GalleryEditor.js';
import { FaqPage } from '../pages/FaqPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { adminSessionStore } from '../stores/admin-session.store.js';
import { observer } from 'mobx-react-lite';

const navigationGroups = [
  { label: 'תפעול שוטף', items: [
    { label: 'מסלול היום', to: '/', icon: IconHome },
    { label: 'הזמנות', to: '/orders', icon: IconChecklist },
    { label: 'משימות', to: '/tasks', icon: IconChecklist },
    { label: 'ייצור', to: '/production', icon: IconBox },
    { label: 'תוויות אריזה', to: '/packing', icon: IconBox },
    { label: 'רשימת אספקה', to: '/delivery', icon: IconTruck },
  ] },
  { label: 'ניהול והגדרות', items: [
    { label: 'מלאי', to: '/inventory', icon: IconBox },
    { label: 'מוצרים וקטגוריות', to: '/catalog', icon: IconBox },
    { label: 'שאלות ותשובות', to: '/faq', icon: IconChecklist },
    { label: 'גלריה כללית', to: '/gallery', icon: IconPhoto },
  ] },
];

export function App() {
  const location = useLocation();
  const [navigationOpened, { toggle, close }] = useDisclosure(false);
  return (
    <AppShell header={{ height: 72 }} navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !navigationOpened } }} padding="md">
      <AppShell.Header className="app-header">
        <Group justify="space-between" h="100%" px="md">
          <Group gap="xs"><Burger hiddenFrom="sm" opened={navigationOpened} onClick={toggle} aria-label="תפריט ניווט" /><ThemeIcon color="orange" variant="light" radius="xl"><IconTruck size={18} /></ThemeIcon><Title order={3}>ZIS תפעול</Title></Group>
          <Group gap="sm"><Badge color="teal" variant="light">ניהול</Badge><LogoutButton /></Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm"><Stack gap="sm">{navigationGroups.map((group, index) => <Stack key={group.label} gap={4}>{index > 0 && <Divider my="xs" />}<Text px="sm" pt="xs" size="xs" fw={700} c="dimmed">{group.label}</Text>{group.items.map(({ label, to, icon: Icon }) => <NavLink key={to} component={Link} to={to} onClick={close} label={label} leftSection={<Icon size={18} />} active={to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(`${to}/`)} variant="light" />)}{index > 0 && <NavLink label="ניהול החנות" leftSection={<IconSettings size={18} />} defaultOpened={["/notifications", "/settings"].includes(location.pathname)}><NavLink component={Link} to="/settings" onClick={close} label="הגדרות חנות ומשלוח" leftSection={<IconSettings size={18} />} active={location.pathname === "/settings"} /><NavLink component={Link} to="/notifications" onClick={close} label="ניהול התראות" leftSection={<IconBell size={18} />} active={location.pathname === "/notifications"} /></NavLink>}</Stack>)}</Stack></AppShell.Navbar>
      <AppShell.Main><Outlet /></AppShell.Main>
    </AppShell>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const client = useQueryClient();
  return <Button variant="subtle" color="gray" size="xs" onClick={() => { adminSessionStore.clearSession(); client.clear(); navigate('/login', { replace: true }); }}>יציאה</Button>;
}

const ProtectedApp = observer(function ProtectedApp() {
  const client = useQueryClient();
  const authenticated = adminSessionStore.isAuthenticated;
  useEffect(() => { if (!authenticated) client.clear(); }, [authenticated, client]);
  return adminSessionStore.isAuthenticated ? <App /> : <Navigate to="/login" replace />;
});

export function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedApp />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/gallery" element={<GalleryEditor />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
      <Route path="/production" element={<ProductionPage />} />
      <Route path="/production/print" element={<ProductionPrintPage />} />
      <Route path="/packing" element={<PackingReportPage />} />
      <Route path="/delivery" element={<DeliveryReportPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
  </Routes>;
}
