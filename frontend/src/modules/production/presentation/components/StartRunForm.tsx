import React, { useState } from 'react';
import { useStartProductionRunMutation } from '../hooks/useProductionPipeline';
import { Play, Factory, User, Package, AlertCircle, Loader2 } from 'lucide-react';

interface StartRunFormProps {
  onSuccess?: (runId: string) => void;
}

export const StartRunForm: React.FC<StartRunFormProps> = ({ onSuccess }) => {
  const mutation = useStartProductionRunMutation();

  const [orderId, setOrderId] = useState('ORD-2026-001'); // Pre-fill para demo
  const [stationId, setStationId] = useState('EXT-02');
  const [operatorId, setOperatorId] = useState('OP-778');
  const [materialId, setMaterialId] = useState('MAT-RESINA-Z');
  const [quantity, setQuantity] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !stationId || !operatorId || !materialId || quantity <= 0) return;

    mutation.mutate(
      {
        productionOrderId: orderId,
        stationId: stationId,
        operatorId: operatorId,
        reservedInputs: [
          {
            materialId,
            expectedQuantity: { amount: quantity, unit: 'kg' }
          }
        ]
      },
      {
        onSuccess: (data) => {
          if (onSuccess) onSuccess(data.productionRunId);
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
          <Play size={24} className="fill-current" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Iniciar Nueva Corrida</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Factory size={16} /> Identificación
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orden de Producción</label>
            <input 
              type="text" 
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estación / Máquina</label>
            <input 
              type="text" 
              required
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ID Operador</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                required
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Package size={16} /> Reserva de Materiales
          </h3>
          
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Material Requerido (Lote/ID)</label>
              <input 
                type="text" 
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">Cant. Estimada</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="w-16">
                <label className="block text-xs font-medium text-slate-700 mb-1">Unidad</label>
                <input 
                  type="text" 
                  disabled
                  value="kg"
                  className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-500 text-center"
                />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle size={12} /> Reserva lógica. No descuenta inventario.
            </p>
          </div>
        </div>
      </div>

      {mutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-sm">Fallo al iniciar corrida</p>
            <p className="text-sm mt-1">{mutation.error.message}</p>
          </div>
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Corrida Iniciada Exitosamente</p>
            <p className="text-sm mt-1 opacity-90">ID: {mutation.data.productionRunId}</p>
          </div>
          <div className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
            {mutation.data.status}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || mutation.isSuccess}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="animate-spin" size={24} /> Iniciando Hardware...
          </>
        ) : (
          <>
            <Play size={24} className="fill-current" /> INICIAR PRODUCCIÓN
          </>
        )}
      </button>
    </form>
  );
};
