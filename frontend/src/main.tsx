import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { syncServerTime } from './utils/serverTime';
import { queryClient } from './api/queryClient';
import './index.css';

if (typeof window !== 'undefined' && window.electronAPI) {
  document.body.classList.add('electron');
}

export { queryClient };

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
