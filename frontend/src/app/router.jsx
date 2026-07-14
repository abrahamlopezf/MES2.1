import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../modules/auth/pages/LoginPage";

//DEMO MESDemo
import MesDemoHome from "../modules/mes-demo/screens/MesDemoHome";
import GenerateQRScreen from "../modules/mes-demo/screens/GenerateQRScreen";
import WarehouseReceptionScreen from "../modules/mes-demo/screens/WarehouseReceptionScreen";
import MixingScreen from "../modules/mes-demo/screens/MixingScreen";
import ExtrusionDemoScreen from "../modules/mes-demo/screens/ExtrusionDemoScreen";
import WasteDemoScreen from "../modules/mes-demo/screens/WasteDemoScreen";
import TraceabilityDemoScreen from "../modules/mes-demo/screens/TraceabilityDemoScreen";
import LoomDemoScreen from "../modules/mes-demo/screens/LoomDemoScreen";
import AdminSpoolsScreen from "../modules/mes-demo/screens/AdminSpoolsScreen";
import AdminRollsScreen from "../modules/mes-demo/screens/AdminRollsScreen";
import AdminRacksScreen from "../modules/mes-demo/screens/AdminRacksScreen";
import AdminContainersScreen from "../modules/mes-demo/screens/AdminContainersScreen";
import QRHistoryScreen from "../modules/mes-demo/screens/QRHistoryScreen";
import QRAssignmentsScreen from "../modules/mes-demo/screens/QRAssignmentsScreen";
import InventoryScreen from "../modules/mes-demo/screens/InventoryScreen";
import DashboardPage from "../modules/dashboard/pages/DashboardPage";
import HealthPage from "../modules/health/pages/HealthPage";

import UsersPage from "../modules/users/pages/UsersPage";
import RolesPage from "../modules/roles/pages/RolesPage";
import AreasPage from "../modules/areas/pages/AreasPage";
import ReportsPage from "../modules/reports/pages/ReportsPage";

import QrCodesPage from "../modules/qrcodes/pages/QrCodesPage";
import PlaygroundScreen from "../modules/dev/screens/PlaygroundScreen";
import ReceiveMaterialScreen from "../modules/recepcion-material/screens/ReceiveMaterialScreen";
import FormulaPreparationScreen from "../modules/preparacion-formulas/screens/FormulaPreparationScreen";
import ExtrusionStationScreen from "../modules/extrusion/screens/ExtrusionStationScreen";
import WasteRegistrationStationScreen from "../modules/scrap/screens/WasteRegistrationStationScreen";
import QualityStationScreen from "../modules/calidad/screens/QualityStationScreen";
import OperationsCenterScreen from "../modules/dashboard/screens/OperationsCenterScreen";
import { ScannerProvider } from "../core/scanner/ScannerProvider";

import MaterialsPage from "../modules/materials/pages/MaterialsPage";

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
            element: <OperationsCenterScreen />,
          },
          {
            path: '/mes-demo',
            element: <MesDemoHome />,
          },
          {
            path: '/mes-demo/qr',
            element: <GenerateQRScreen />,
          },
          {
            path: '/mes-demo/recepcion',
            element: <WarehouseReceptionScreen />,
          },
          {
            path: '/mes-demo/mezcla',
            element: <MixingScreen />,
          },
          {
            path: '/mes-demo/extrusion',
            element: <ExtrusionDemoScreen />,
          },
          {
            path: '/mes-demo/waste',
            element: <WasteDemoScreen />,
          },
          {
            path: '/mes-demo/telares',
            element: <LoomDemoScreen />,
          },
          {
            path: '/mes-demo/trazabilidad',
            element: <TraceabilityDemoScreen />,
          },
          {
            path: '/mes-demo/admin/spools',
            element: <AdminSpoolsScreen />,
          },
          {
            path: '/mes-demo/admin/rolls',
            element: <AdminRollsScreen />,
          },
          {
            path: '/mes-demo/admin/racks',
            element: <AdminRacksScreen />,
          },
          {
            path: '/mes-demo/admin/containers',
            element: <AdminContainersScreen />,
          },
          {
            path: '/mes-demo/qr-history',
            element: <QRHistoryScreen />,
          },
          {
            path: '/mes-demo/qr-assignments',
            element: <QRAssignmentsScreen />,
          },
          {
            path: '/mes-demo/inventory',
            element: <InventoryScreen />,
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
            path: '/recepcion',
            element: (
              <ScannerProvider>
                <ReceiveMaterialScreen />
              </ScannerProvider>
            ),
          },
          {
            path: '/formulas',
            element: (
              <ScannerProvider>
                <FormulaPreparationScreen />
              </ScannerProvider>
            ),
          },
          {
            path: '/extrusion',
            element: (
              <ScannerProvider>
                <ExtrusionStationScreen />
              </ScannerProvider>
            ),
          },
          {
            path: '/scrap',
            element: (
              <ScannerProvider>
                <WasteRegistrationStationScreen />
              </ScannerProvider>
            ),
          },
          {
            path: '/calidad',
            element: (
              <ScannerProvider>
                <QualityStationScreen />
              </ScannerProvider>
            ),
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
            path: '/playground',
            element: <PlaygroundScreen />,
          },
        ],
      },
    ],
  },
]);
