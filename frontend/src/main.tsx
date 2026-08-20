import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { syncServerTime } from './utils/serverTime';
import './index.css';

if (typeof window !== 'undefined' && window.electronAPI) {
  document.body.classList.add('electron');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: 'always',
    },
  },
});

syncServerTime().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <HashRouter future={{ v7_startTransition: true }}>
              <App />
            </HashRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
