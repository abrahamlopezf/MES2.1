import React from 'react';

export interface IdentitySummaryDTO {
  id: string;
  industrialCode: string;
  status: string;
  custodyOwner: string;
  batchId: string;
  generatedAt: string;
}

interface Props {
  identity: IdentitySummaryDTO;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Identity Drawer Mock.
 * Cumple con el ADR: Es una vista transversal que solo consume DTOs, no el Agregado.
 */
export function IdentityDrawer({ identity, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 z-50 transform transition-transform">
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800">Identity Details</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold px-2 py-1 bg-slate-100 rounded">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Código Industrial</p>
            <p className="text-xl font-mono text-blue-700 font-bold bg-blue-50 py-2 px-3 rounded mt-1 border border-blue-100">
              {identity.industrialCode}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Estado</p>
              <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {identity.status}
              </span>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Custodia</p>
              <p className="text-sm font-medium text-slate-700 mt-1">{identity.custodyOwner}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Lote Origen</p>
            <p className="text-sm text-slate-700 font-mono mt-1">{identity.batchId}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fecha de Generación</p>
            <p className="text-sm text-slate-700 mt-1">{identity.generatedAt}</p>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <button className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded font-medium transition-colors">
            Ver Historial de Trazabilidad
          </button>
        </div>
      </div>
    </div>
  );
}
