import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../modules/auth/pages/LoginPage";
import HealthPage from "../modules/health/pages/HealthPage";
import UsersPage from "../modules/users/pages/UsersPage";
import DashboardPage from "../modules/dashboard/pages/DashboardPage";



// Identity Center
import { GenerateBatchPage } from '../modules/identity/presentation/pages/GenerateBatchPage';
import { IdentityRequestsPage } from '../modules/identity/presentation/pages/IdentityRequestsPage';
import { PrintBatchPage } from '../modules/identity/presentation/pages/PrintBatchPage';
import { IdentityCustodyPage } from '../modules/identity/presentation/pages/IdentityCustodyPage';

// Production
import WorkStationTerminalPage from '../modules/production/presentation/pages/WorkStationTerminalPage';
import { MixingTerminalPage } from '../modules/production/presentation/pages/MixingTerminalPage';
import { AndonBoardPage } from '../modules/production/presentation/pages/AndonBoardPage';
import { ExtrusionTerminalPage } from '../modules/production/presentation/pages/ExtrusionTerminalPage';
import { TraceabilityTreePage } from '../modules/traceability/presentation/pages/TraceabilityTreePage';

// Warehouse
import { WarehouseTerminalPage } from '../modules/warehouse/presentation/pages/WarehouseTerminalPage';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/health",
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
          // Rutas de Identity Center
          {
            path: '/identity/generate',
            element: <GenerateBatchPage />,
          },
          {
            path: '/identity/requests',
            element: <IdentityRequestsPage />,
          },
          {
            path: '/identity/print',
            element: <PrintBatchPage />,
          },
          {
            path: '/identity/custody',
            element: <IdentityCustodyPage />,
          },
          // Trazabilidad
          {
            path: '/traceability/genealogy',
            element: <TraceabilityTreePage />,
          },
          // Rutas de Producción
          {
            path: '/production',
            children: [
              {
                path: 'stations',
                element: <WorkStationTerminalPage />
              },
              {
                path: 'mixing',
                element: <MixingTerminalPage />
              },
              {
                path: 'extrusion',
                element: <ExtrusionTerminalPage />
              },
              {
                path: 'extrusion/rack/new',
                element: <ExtrusionTerminalPage />
              },
              {
                path: 'machines',
                element: <AndonBoardPage />
              }
            ]
          },
          // Warehouse
          {
            path: '/warehouse',
            children: [
              {
                path: 'receive',
                element: <WarehouseTerminalPage />
              }
            ]
          }
        ],
      },
    ],
  },
]);
