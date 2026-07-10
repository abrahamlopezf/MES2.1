import { createBrowserRouter, Navigate } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';

import LoginPage from '../modules/auth/pages/LoginPage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import HealthPage from '../modules/health/pages/HealthPage';

import UsersPage from '../modules/users/pages/UsersPage';
import RolesPage from '../modules/roles/pages/RolesPage';
import AreasPage from '../modules/areas/pages/AreasPage';
import ReportsPage from '../modules/reports/pages/ReportsPage';

import QrCodesPage from '../modules/qrcodes/pages/QrCodesPage';
import UiPreviewPage from '../modules/dev/pages/UiPreviewPage';

import MaterialsPage from '../modules/materials/pages/MaterialsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/health',
    element: <HealthPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/users',
            element: <UsersPage />,
          },
          {
            path: '/roles',
            element: <RolesPage />,
          },
          {
            path: '/qr',
            element: <QrCodesPage />,
          },
          {
            path: '/materials',
            element: <MaterialsPage />,
          },
          {
            path: '/areas',
            element: <AreasPage />,
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },
          {
            path: '/ui-preview',
            element: <UiPreviewPage />,
          },
        ],
      },
    ],
  },
]);