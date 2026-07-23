import React, { useState, useEffect } from 'react';
import { useMixing } from '../hooks/useMixing';
import { useQuery } from '@tanstack/react-query';
import { catalogFacade } from '../../../catalog/infrastructure/di/CatalogModuleDI';
import { Play, Factory, QrCode, Scale, Loader2, AlertCircle } from 'lucide-react';
import { ManualWeightAdapter } from '../../infrastructure/adapters/ManualWeightAdapter';

const weightAdapter = new ManualWeightAdapter();

export const MixingTerminalForm: React.FC = () => {
  const mutation = useMixing();

  const { data: formulas, isLoading: loadingFormulas } = useQuery({
    queryKey: ['catalog', 'formulas'],
    queryFn: () => catalogFacade.getAllProcessDefinitions().then(res => res.filter(f => f.type === 'MIX_FORMULA'))
  });
  
  const { data: stations, isLoading: loadingStations } = useQuery({
    queryKey: ['catalog', 'stations'],
    queryFn: () => catalogFacade.getAllStations().then(res => res.filter(s => s.machineType === 'MIXER'))
  });

  const [formulaId, setFormulaId] = useState('');
  const [stationId, setStationId] = useState('');
  const [outputIdentityTokenId, setOutputIdentityTokenId] = useState('QR-MIX-0001');
  const [operatorId, setOperatorId] = useState('OP-202');
  
  // Inputs
  const [inputIdentityTokenId, setInputIdentityTokenId] = useState('QR-ALM-0001');
  const [simulatedWeight, setSimulatedWeight] = useState(100);
  
  const selectedFormula = formulas?.find(f => f.id === formulaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaId || !stationId || !outputIdentityTokenId) return;

    // Simulate weight capture from hardware
    weightAdapter.setSimulatedWeight(simulatedWeight);
    const weight = await weightAdapter.captureWeight();

    mutation.mutate({
      formulaId,
      outputIdentityTokenId,
      stationId,
      operatorId,
      inputs: [
        {
          identityTokenId: inputIdentityTokenId,
          stockUnitId: 'SU-FAKE-001', // Ideally queried from warehouse by QR
          materialId: selectedFormula?.ingredients?.[0]?.materialId || 'MAT-PE-HD',
          quantity: weight.value,
          unit: weight.unit
        }
      ],
      outputQuantity: weight.value,
      outputUnit: weight.unit
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
          <Factory size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Terminal de Mezclado</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Contexto de Operación
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estación (Mixer)</label>
            <select
              required
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="" disabled>-- Seleccione Estación --</option>
              {stations?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fórmula</label>
            <select
              required
              value={formulaId}
              onChange={(e) => setFormulaId(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="" disabled>-- Seleccione Fórmula --</option>
              {formulas?.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">QR Salida (Vacio)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <QrCode size={16} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                required
                value={outputIdentityTokenId}
                onChange={(e) => setOutputIdentityTokenId(e.target.value)}
                className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono bg-yellow-50"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Insumos & Pesaje
          </h3>
          
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">QR Materia Prima (Entrada)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <QrCode size={16} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  required
                  value={inputIdentityTokenId}
                  onChange={(e) => setInputIdentityTokenId(e.target.value)}
                  className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Scale size={16}/> Simular Báscula (ManualWeightAdapter)
              </label>
              <div className="flex gap-3">
                <input 
                  type="number" 
                  required
                  value={simulatedWeight}
                  onChange={(e) => setSimulatedWeight(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <input 
                  type="text" 
                  disabled
                  value="KG"
                  className="w-24 border border-slate-200 bg-slate-100 rounded px-3 py-2 text-lg text-slate-500 text-center font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {mutation.isSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Mezcla Generada Exitosamente</p>
            <p className="text-sm mt-1 opacity-90">ID: {mutation.data.transformationId}</p>
          </div>
          <div className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
            COMPLETED
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || loadingFormulas || loadingStations}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="animate-spin" size={24} /> Procesando Mezcla...
          </>
        ) : (
          <>
            <Play size={24} className="fill-current" /> EJECUTAR MEZCLA
          </>
        )}
      </button>
    </form>
  );
};
