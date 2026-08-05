import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../modules/auth/pages/LoginPage";
import HealthPage from "../modules/health/pages/HealthPage";
import UsersPage from "../modules/users/pages/UsersPage";
import DashboardPage from "../modules/dashboard/pages/DashboardPage";
import MaterialsPage from "../modules/materials/pages/MaterialsPage";
import CategoriesPage from "../modules/materials/pages/CategoriesPage";
import FamiliesPage from "../modules/materials/pages/FamiliesPage";
import CodesPage from "../modules/materials/pages/CodesPage";
import TypesPage from "../modules/materials/pages/TypesPage";
import BrandsPage from "../modules/materials/pages/BrandsPage";
import MaterialsLayout from "../modules/materials/layouts/MaterialsLayout";
import QrCodesPage from "../modules/qrcodes/pages/QrCodesPage";
import { AreasPage } from "../modules/dashboard/pages/AreasPage";
import ProfilePage from "../modules/users/pages/ProfilePage";



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
import { ReceptionProvider } from '../modules/reception/ReceptionProvider';
import { WarehouseProvider } from '../modules/warehouse/WarehouseProvider';

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
          {
            path: '/areas',
            element: <AreasPage />,
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/materials',
            element: <MaterialsLayout />,
            children: [
              {
                index: true,
                element: <Navigate to="/materials/list" replace />
              },
              {
                path: 'list',
                element: <MaterialsPage />
              },
              {
                path: 'families',
                element: <FamiliesPage />
              },
              {
                path: 'codes',
                element: <CodesPage />
              },
              {
                path: 'types',
                element: <TypesPage />
              },
              {
                path: 'brands',
                element: <BrandsPage />
              }
            ]
          },
          {
            path: '/qrcodes',
            element: <QrCodesPage />,
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
                element: <ReceptionProvider />
              },
              {
                path: 'inventory',
                element: <WarehouseProvider />
              }
            ]
          }
        ],
      },
    ],
  },
]);
