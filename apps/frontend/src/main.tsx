import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import { Toaster } from './components/ui/sonner';
import './index.css';
import './i18n';
import { initTheme } from './lib/theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors theme="dark" position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
