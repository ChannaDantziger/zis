import { useEffect } from 'react';
import { Button, Stack, Text, Title } from '@mantine/core';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { CartDrawer } from '../features/cart/CartDrawer';
import { SiteHeader } from '../shared/components/SiteHeader';
import { SiteFooter } from '../shared/components/SiteFooter';
import { StoreStatusBanner } from '../shared/store-status';

export function App() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const section = document.getElementById(location.hash.slice(1));
      section?.scrollIntoView();
      section?.querySelector<HTMLElement>('h1, h2')?.focus({ preventScroll: true });
    }
    else window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);
  return <>
    <a className="skip-link" href="#main">דלגו לתוכן</a>
    <SiteHeader />
    <main id="main" tabIndex={-1}>
      <div className="content-width status-banner"><StoreStatusBanner /></div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<Navigate to={{ pathname: '/', search: location.search, hash: '#catalog' }} replace />} />
        <Route path="/products/:productId" element={<><HomePage /><ProductPage /></>} />
        <Route path="/cart" element={<Navigate to="/checkout" replace />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="*" element={<Stack className="content-width" py="xl"><Title>העמוד לא נמצא</Title><Text>אפשר לחזור לקטלוג ולהמשיך משם.</Text><Button component={Link} to="/#catalog">לקטלוג</Button></Stack>} />
      </Routes>
    </main>
    <SiteFooter />
    <CartDrawer />
  </>;
}
