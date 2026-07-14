import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="almacen" element={<div className="p-8 text-center text-slate-400">Módulo de Almacén en construcción...</div>} />
          <Route path="mezclado" element={<div className="p-8 text-center text-slate-400">Módulo de Mezclado en construcción...</div>} />
          <Route path="extrusion" element={<div className="p-8 text-center text-slate-400">Módulo de Extrusión en construcción...</div>} />
          <Route path="telares" element={<div className="p-8 text-center text-slate-400">Módulo de Telares en construcción...</div>} />
          <Route path="settings" element={<div className="p-8 text-center text-slate-400">Ajustes del Sistema</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
