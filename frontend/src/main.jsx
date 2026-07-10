import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './app/router';
import AppQueryProvider from './providers/AppQueryProvider';

import './styles/variables.css';
import './styles/accessibility.css';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppQueryProvider>
      <RouterProvider router={router} />
    </AppQueryProvider>
  </React.StrictMode>
);