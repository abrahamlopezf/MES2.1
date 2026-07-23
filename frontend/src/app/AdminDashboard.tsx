import React from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Printer, PackagePlus, Settings2, Activity, Network } from 'lucide-react';
import { useAuth } from '../modules/identity/presentation/context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const links = [
    {
      title: 'Generación Masiva de QR',
      description: 'Crea lotes de QRs vírgenes para almacén y producción.',
      path: '/identity/generate',
      icon: <QrCode size={32} className="text-blue-500" />
    },
    {
      title: 'Pipeline de Impresión',
      description: 'Envía los lotes generados a las impresoras (ZEBRA).',
      path: '/identity/print',
      icon: <Printer size={32} className="text-purple-500" />
    },
    {
      title: 'Trazabilidad (Custodia)',
      description: 'Inspecciona la vida y transformaciones de un QR.',
      path: '/identity/custody/MOCK-123',
      icon: <Network size={32} className="text-slate-500" />
    }
  ];

  const appLinks = [
    {
      title: 'Recepción Almacén',
      description: 'Simula el formulario de entrada de material virgen.',
      path: '/warehouse/entry/new',
      icon: <PackagePlus size={32} className="text-emerald-500" />
    },
    {
      title: 'Terminal de Mezclado',
      description: 'Simula el consumo de resinas y creación de fórmulas.',
      path: '/production/mixing',
      icon: <Activity size={32} className="text-amber-500" />
    },
    {
      title: 'Terminal de Extrusión',
      description: 'Alimentación de máquina y generación de salidas en Racks.',
      path: '/production/extrusion',
      icon: <Settings2 size={32} className="text-indigo-500" />
    },
    {
      title: 'Andon Board (Piso)',
      description: 'Tablero de control de estados de máquinas en tiempo real.',
      path: '/production/machines',
      icon: <Activity size={32} className="text-red-500" />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 p-6">
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portal del Sistema MES/ERP</h1>
          <p className="mt-2 text-slate-300">Autenticado como: <span className="font-bold text-white">{user?.role}</span></p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <QrCode className="text-blue-600" /> Identity Center (Administración)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {links.map((l) => (
            <Link key={l.path} to={l.path} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="mb-4 bg-slate-50 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {l.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{l.title}</h3>
              <p className="text-slate-500 text-sm">{l.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Settings2 className="text-indigo-600" /> Terminales de Operación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {appLinks.map((l) => (
            <Link key={l.path} to={l.path} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all group">
              <div className="mb-4 bg-slate-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {l.icon}
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{l.title}</h3>
              <p className="text-slate-500 text-xs">{l.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
