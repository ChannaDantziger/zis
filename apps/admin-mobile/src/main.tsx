import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import './styles.css';
import { AppRoutes } from './app/App.js';
import { reaction } from 'mobx';
import { adminSessionStore } from './stores/admin-session.store.js';
import { catalogStore } from './features/catalog/catalog.store.js';
import { catalogMediaStore } from './features/catalog/catalog-media.store.js';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

reaction(() => adminSessionStore.accessToken, () => {
  queryClient.clear();
  catalogStore.reset();
  catalogMediaStore.reset();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={{ primaryColor: 'orange', fontFamily: 'Arial, sans-serif', headings: { fontFamily: 'Arial, sans-serif' } }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter><AppRoutes /></BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
