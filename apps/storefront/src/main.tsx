import React from 'react';
import ReactDOM from 'react-dom/client';
import { DirectionProvider, MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { theme } from './app/theme';
import '@mantine/core/styles.css';
import './styles.css';

const queryClient = new QueryClient({ defaultOptions: { queries: {
  retry: 1, staleTime: 30_000, refetchOnWindowFocus: true,
} } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DirectionProvider initialDirection="rtl">
      <MantineProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter><App /></BrowserRouter>
        </QueryClientProvider>
      </MantineProvider>
    </DirectionProvider>
  </React.StrictMode>,
);
