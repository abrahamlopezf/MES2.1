import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './app/router.jsx';
import { AppQueryProvider } from './core/query/providers/QueryProvider';
import { GlobalErrorBoundary } from './core/error/GlobalErrorBoundary';

import { Toaster } from 'sonner';
import { AuthProvider } from './modules/identity/presentation/context/AuthContext';
import './index.css';
import './styles/variables.css';
import './styles/accessibility.css';
import './styles/layout.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AppQueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </AppQueryProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);