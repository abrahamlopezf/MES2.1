import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './app/router';
import { AppQueryProvider } from './core/query/providers/QueryProvider';
import { GlobalErrorBoundary } from './core/error/GlobalErrorBoundary';

import './index.css';
import './styles/variables.css';
import './styles/accessibility.css';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AppQueryProvider>
        <RouterProvider router={router} />
      </AppQueryProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);