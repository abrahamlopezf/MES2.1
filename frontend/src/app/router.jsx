import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../modules/auth/pages/LoginPage";

// Productive routes
import HealthPage from "../modules/health/pages/HealthPage";

import UsersPage from "../modules/users/pages/UsersPage";
import RolesPage from "../modules/roles/pages/RolesPage";
import AreasPage from "../modules/areas/pages/AreasPage";
import ReportsPage from "../modules/reports/pages/ReportsPage";

import QrCodesPage from "../modules/qrcodes/pages/QrCodesPage";
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
          // Productive modules
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
          }
        ],
      },
    ],
  },
]);
