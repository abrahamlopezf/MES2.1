import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../modules/auth/pages/LoginPage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';

import { GenerateBatchPage } from '../modules/identity/presentation/pages/GenerateBatchPage';
import { IdentityRequestsPage } from '../modules/identity/presentation/pages/IdentityRequestsPage';
import { PrintBatchPage } from '../modules/identity/presentation/pages/PrintBatchPage';
import { IdentityCustodyPage } from '../modules/identity/presentation/pages/IdentityCustodyPage';
import { WarehouseTerminalPage } from '../modules/warehouse/presentation/pages/WarehouseTerminalPage';
import { MixingTerminalPage } from '../modules/production/presentation/pages/MixingTerminalPage';
import { AndonBoardPage } from '../modules/production/presentation/pages/AndonBoardPage';
import { ExtrusionTerminalPage } from '../modules/production/presentation/pages/ExtrusionTerminalPage';
import { AdminDashboard } from './AdminDashboard';

// Router Config Definitivo
export const AppRouter = () => {
  return (
    <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rutas Protegidas bajo AppLayout */}
        <Route element={<AppLayout />}>
          {/* ERP Main */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/portal" element={<AdminDashboard />} />
          
          {/* Identity Center */}
          <Route path="/identity">
            <Route path="generate" element={<GenerateBatchPage />} />
            <Route path="requests" element={<IdentityRequestsPage />} />
            <Route path="print" element={<PrintBatchPage />} />
            <Route path="custody" element={<IdentityCustodyPage />} />
            <Route path="batches" element={<div>Identity Batches</div>} />
            <Route path="tokens" element={<div>Identity Tokens</div>} />
          </Route>
          
          {/* Traceability Center */}
          <Route path="/traceability">
            <Route path="ledger" element={<div>Traceability Ledger</div>} />
            <Route path="genealogy" element={<div>Full Traceability Tree</div>} />
          </Route>
          
          {/* Production */}
          <Route path="/production">
            <Route path="mixing" element={<MixingTerminalPage />} />
            <Route path="extrusion" element={<ExtrusionTerminalPage />} />
            <Route path="extrusion/rack/new" element={<ExtrusionTerminalPage />} />
            <Route path="orders" element={<div>Production Orders</div>} />
            <Route path="stations" element={<div>Work Stations</div>} />
            <Route path="runs" element={<div>Production Runs</div>} />
            <Route path="machines" element={<AndonBoardPage />} />
          </Route>

          {/* Warehouse */}
          <Route path="/warehouse">
            <Route path="receive" element={<WarehouseTerminalPage />} />
          </Route>
        </Route>
    </Routes>
  );
};
