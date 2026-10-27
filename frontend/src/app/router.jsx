import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

import LoginPage from "../modules/auth/pages/LoginPage";
import ForgotPasswordPage from "../modules/auth/pages/ForgotPasswordPage";
import HealthPage from "../modules/health/pages/HealthPage";
import UsersPage from "../modules/users/pages/UsersPage";
import RolesPage from "../modules/roles/pages/RolesPage";
import DashboardPage from "../modules/dashboard/pages/DashboardPage";
import MaterialsPage from "../modules/materials/pages/MaterialsPage";
import CategoriesPage from "../modules/materials/pages/CategoriesPage";
import FamiliesPage from "../modules/materials/pages/FamiliesPage";
import CodesPage from "../modules/materials/pages/CodesPage";
import TypesPage from "../modules/materials/pages/TypesPage";
import BrandsPage from "../modules/materials/pages/BrandsPage";
import UnitsPage from "../modules/materials/pages/UnitsPage";
import LocationsPage from "../modules/materials/pages/LocationsPage";
import SuppliersPage from "../modules/materials/pages/SuppliersPage";
import TagsPage from "../modules/materials/pages/TagsPage";
import MaterialsLayout from "../modules/materials/layouts/MaterialsLayout";

import { AreasPage } from "../modules/dashboard/pages/AreasPage";
import ProfilePage from "../modules/users/pages/ProfilePage";

// Identity Center
import { GenerateBatchPage } from '../modules/identity/presentation/pages/GenerateBatchPage';
import { IdentityRequestsPage } from '../modules/identity/presentation/pages/IdentityRequestsPage';
import { PrintBatchPage } from '../modules/identity/presentation/pages/PrintBatchPage';
import { IdentityCustodyPage } from '../modules/identity/presentation/pages/IdentityCustodyPage';
import { QrHistoryPage } from '../modules/identity/presentation/pages/QrHistoryPage';

// Production
import WorkStationTerminalPage from '../modules/production/presentation/pages/WorkStationTerminalPage';
import { MixingTerminalPage } from '../modules/production/presentation/pages/MixingTerminalPage';
import { AndonBoardPage } from '../modules/production/presentation/pages/AndonBoardPage';
import { ExtrusionDashboard } from '../modules/production/presentation/pages/ExtrusionDashboard';
import { FormulasPage } from '../modules/production/presentation/pages/FormulasPage';
import { MachinesPage } from '../modules/production/presentation/pages/MachinesPage';

import { ExtrusionTerminalPage } from '../modules/production/presentation/pages/ExtrusionTerminalPage';
import { TraceabilityTreePage } from '../modules/traceability/presentation/pages/TraceabilityTreePage';
import ExtrusionBoardContainer from '../modules/extrusion/presentation/containers/ExtrusionBoardContainer';
import PtiIngressContainer from '../modules/extrusion/presentation/containers/PtiIngressContainer';
import { SuperAdminRoute, ExtrusionRoute, TelaresRoute, WarehouseRoute, GloboRoute, LaminadoRoute } from './SuperAdminRoute';
import AdminAlmRoute from './AdminAlmRoute';
import PermissionRoute from './PermissionRoute';

// Telares & Ruteo (Fase Escalonada)
import TelaresTerminalPage from '../modules/telares/presentation/pages/TelaresTerminalPage';
import RoutingStationTerminalPage from '../modules/telares/presentation/pages/RoutingStationTerminalPage';
import ViajeroTrackerPage from '../modules/telares/presentation/pages/ViajeroTrackerPage';
import TelaresCatalogPage from '../modules/telares/presentation/pages/TelaresCatalogPage';
import TelaresOperatorsPage from '../modules/telares/presentation/pages/TelaresOperatorsPage';
import TelaresDashboard from '../modules/telares/presentation/pages/TelaresDashboard';
import GloboCatalogPage from '../modules/globo/pages/GloboCatalogPage';
import GloboWipPage from '../modules/globo/pages/GloboWipPage';
import LaminadoCatalogPage from '../modules/laminado/pages/LaminadoCatalogPage';
import LaminadoWipPage from '../modules/laminado/pages/LaminadoWipPage';

// Warehouse
import { ReceptionProvider } from '../modules/reception/ReceptionProvider';
import { WarehouseProvider } from '../modules/warehouse/WarehouseProvider';
import { WarehouseInventoryPage } from '../modules/warehouse/presentation/pages/WarehouseInventoryPage';
import { MaterialLotesPage } from '../modules/warehouse/presentation/pages/MaterialLotesPage';
import { LoteDetailsPage } from '../modules/warehouse/presentation/pages/LoteDetailsPage';
import { MermaScrapPage } from '../modules/warehouse/presentation/pages/MermaScrapPage';
import { ConsumptionOrdersPage } from '../modules/warehouse/presentation/pages/ConsumptionOrdersPage';
import { AreaInventoryPage } from '../modules/warehouse/presentation/pages/AreaInventoryPage';
import { WarehouseReportsPage } from '../modules/warehouse/presentation/pages/WarehouseReportsPage';
import { SilosManagementPage } from '../modules/warehouse/presentation/pages/SilosManagementPage';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/health",
    element: <HealthPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
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
            element: (
              <SuperAdminRoute>
                <UsersPage />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/admin',
            element: (
              <SuperAdminRoute>
                <Navigate to="/users" replace />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/usuarios',
            element: (
              <SuperAdminRoute>
                <Navigate to="/users" replace />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/gestor-usuarios',
            element: (
              <SuperAdminRoute>
                <Navigate to="/users" replace />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/roles',
            element: (
              <SuperAdminRoute>
                <RolesPage />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/areas',
            element: (
              <SuperAdminRoute>
                <AreasPage />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/areas/:group',
            element: (
              <SuperAdminRoute>
                <AreasPage />
              </SuperAdminRoute>
            ),
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/materials',
            element: (
              <WarehouseRoute>
                <MaterialsLayout />
              </WarehouseRoute>
            ),
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
              },
              {
                path: 'units',
                element: <UnitsPage />
              },
              {
                path: 'locations',
                element: <LocationsPage />
              },
              {
                path: 'suppliers',
                element: <SuppliersPage />
              },
              {
                path: 'tags',
                element: <TagsPage />
              }
            ]
          },
          // Rutas de Identity Center
          {
            path: '/identity/generate',
            element: <PermissionRoute permissions={['qr.create', 'qr.generate']}><GenerateBatchPage /></PermissionRoute>,
          },
          {
            path: '/identity/requests',
            element: <PermissionRoute permissions={['qr.assign']}><IdentityRequestsPage /></PermissionRoute>,
          },
          {
            path: '/identity/print',
            element: <PermissionRoute permissions={['qr.read', 'qr.create', 'qr.generate']}><PrintBatchPage /></PermissionRoute>,
          },
          {
            path: '/identity/custody',
            element: <PermissionRoute permissions={['qr.assign']}><IdentityCustodyPage /></PermissionRoute>,
          },
          // Trazabilidad
          {
            path: '/traceability/genealogy',
            element: <PermissionRoute permissions={['qr.read']}><TraceabilityTreePage /></PermissionRoute>,
          },
          // Historial de QRs (Identity)
          {
            path: '/qrcodes',
            element: <PermissionRoute permissions={['qr.read', 'qr.history.read', 'qr.events.read']}><QrHistoryPage /></PermissionRoute>,
          },
          // Rutas de Extrusión
          {
            path: '/extrusion/board',
            element: (
              <ExtrusionRoute>
                <ExtrusionBoardContainer />
              </ExtrusionRoute>
            )
          },
          {
            path: '/extrusion/rack-ingress',
            element: (
              <ExtrusionRoute>
                <PtiIngressContainer />
              </ExtrusionRoute>
            )
          },
          {
            path: '/extrusion/dashboard',
            element: (
              <ExtrusionRoute>
                <ExtrusionDashboard />
              </ExtrusionRoute>
            )
          },
          {
            path: '/production',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: 'machines',
                element: (
                  <ExtrusionRoute>
                    <MachinesPage />
                  </ExtrusionRoute>
                )
              },
              {
                path: 'formulas',
                element: (
                  <ExtrusionRoute>
                    <FormulasPage />
                  </ExtrusionRoute>
                )
              },
              {
                path: 'stations',
                element: (
                  <ExtrusionRoute>
                    <WorkStationTerminalPage />
                  </ExtrusionRoute>
                )
              },
              {
                path: 'mixing',
                element: (
                  <ExtrusionRoute>
                    <MixingTerminalPage />
                  </ExtrusionRoute>
                )
              },
              {
                path: 'extrusion',
                element: (
                  <ExtrusionRoute>
                    <ExtrusionTerminalPage />
                  </ExtrusionRoute>
                )
              },
              {
                path: 'extrusion/rack/new',
                element: (
                  <ExtrusionRoute>
                    <ExtrusionTerminalPage />
                  </ExtrusionRoute>
                )
              },
              {
                path: 'andon',
                element: (
                  <ExtrusionRoute>
                    <AndonBoardPage />
                  </ExtrusionRoute>
                )
              },
              // Telares y Estaciones de Ruteo
              {
                path: 'telares',
                element: (
                  <TelaresRoute>
                    <TelaresTerminalPage />
                  </TelaresRoute>
                )
              },
              {
                path: 'laminado',
                element: (
                  <LaminadoRoute>
                    <RoutingStationTerminalPage stationNameOverride="LAMINADO" />
                  </LaminadoRoute>
                )
              },
              {
                path: 'globo',
                element: (
                  <GloboRoute>
                    <RoutingStationTerminalPage stationNameOverride="GLOBO" />
                  </GloboRoute>
                )
              },
              {
                path: 'corte',
                element: (
                  <TelaresRoute>
                    <RoutingStationTerminalPage stationNameOverride="CORTE" />
                  </TelaresRoute>
                )
              },
              {
                path: 'viajero-tracker',
                element: (
                  <TelaresRoute>
                    <ViajeroTrackerPage />
                  </TelaresRoute>
                )
              }
            ]
          },
          // Alias directos de planta para escáneres y operadores
          {
            path: '/telares',
            element: <Navigate to="/production/telares" replace />
          },
          {
            path: '/laminado',
            element: <Navigate to="/production/laminado" replace />
          },
          {
            path: '/globo',
            element: <Navigate to="/production/globo" replace />
          },
          {
            path: '/telares/dashboard',
            element: <TelaresRoute><TelaresDashboard /></TelaresRoute>
          },
          {
            path: '/production/telares-dashboard',
            element: <TelaresRoute><TelaresDashboard /></TelaresRoute>
          },
          {
            path: '/telares/catalogos',
            element: <TelaresRoute><TelaresCatalogPage /></TelaresRoute>
          },
          {
            path: '/telares/operadores',
            element: <TelaresRoute><TelaresOperatorsPage /></TelaresRoute>
          },
          {
            path: '/telares/viajero',
            element: <Navigate to="/production/viajero-tracker" replace />
          },
          {
            path: '/globo/catalogos',
            element: <GloboRoute><GloboCatalogPage /></GloboRoute>
          },
          {
            path: '/globo/wip',
            element: <GloboRoute><GloboWipPage /></GloboRoute>
          },
          {
            path: '/laminado/catalogos',
            element: <LaminadoRoute><LaminadoCatalogPage /></LaminadoRoute>
          },
          {
            path: '/laminado/wip',
            element: <LaminadoRoute><LaminadoWipPage /></LaminadoRoute>
          },
          {
            path: '/viajero',
            element: <Navigate to="/production/viajero-tracker" replace />
          },
          // Warehouse
          {
            path: '/warehouse',
            element: <WarehouseRoute><Outlet /></WarehouseRoute>,
            children: [
              { index: true, element: <Navigate to="/warehouse/inventory" replace /> },
              {
                path: 'receive',
                element: (
                  <AdminAlmRoute>
                    <ReceptionProvider />
                  </AdminAlmRoute>
                )
              },
              {
                path: 'inventory',
                element: <WarehouseInventoryPage />
              },
              {
                path: 'materials/:materialId/lotes',
                element: <MaterialLotesPage />
              },
              {
                path: 'lotes/:id',
                element: <LoteDetailsPage />
              },
              {
                path: 'merma-scrap',
                element: <MermaScrapPage />
              },
              {
                path: 'traceability',
                element: <WarehouseProvider />
              },
              {
                path: 'orders',
                element: <ConsumptionOrdersPage />
              },
              {
                path: 'silos',
                element: <SilosManagementPage />
              },
              {
                path: 'reports',
                element: (
                  <AdminAlmRoute>
                    <WarehouseReportsPage />
                  </AdminAlmRoute>
                )
              }
            ]
          }
        ],
      },
    ],
  },
]);
