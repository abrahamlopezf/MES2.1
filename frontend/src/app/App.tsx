import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { Toaster } from 'sonner';
import { AuthProvider } from '../modules/identity/presentation/context/AuthContext';
import { GlobalScannerModal } from '../modules/identity/presentation/context/GlobalScannerModal';
import { RoleSwitcher } from '../modules/identity/presentation/context/RoleSwitcher';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RoleSwitcher />
          <AppRouter />
          <Toaster />
          <GlobalScannerModal />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
