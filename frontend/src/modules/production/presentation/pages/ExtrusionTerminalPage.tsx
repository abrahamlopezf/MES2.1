import React, { useState } from 'react';
import { useExtrusion } from '../hooks/useExtrusion';
import { useAuth } from '../../../identity/presentation/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Settings2, ArrowRight, QrCode, Layers, Loader2, PackagePlus } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const ExtrusionTerminalPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  
  const isNewRackRoute = location.pathname.includes('/rack/new');
  const qrFromUrl = searchParams.get('qr') || '';
  const feedQrFromUrl = searchParams.get('feedQr') || '';
  
  const { startExtrusion, registerRoll, registerRack } = useExtrusion();
  
  const [extrusionId, setExtrusionId] = useState<string | null>(null);
  
  // Feed form
  const [feedQr, setFeedQr] = useState(feedQrFromUrl);
  const [recipeId, setRecipeId] = useState('REC-EXT-PE');
  const [stationId, setStationId] = useState('ST-EXT-01');

  // Rack & Roll form
  const [rackId, setRackId] = useState('');
  const [rollQr, setRollQr] = useState('');
  const [rollQty, setRollQty] = useState(30);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedQr) return;
    
    startExtrusion.mutate(
      { recipeId, stationId, operatorId: user?.id || 'OP-100', mixBatchQR: feedQr },
      { onSuccess: (data) => setExtrusionId(data.transformationId) }
    );
  };

  const handleRegisterRoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extrusionId || !rackId || !rollQr) return;

    registerRoll.mutate({
      extrusionId,
      rackId,
      rollQR: rollQr,
      operatorId: user?.id || 'OP-100',
      quantity: rollQty,
      unit: 'KG'
    });
  };

  const handleRegisterRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackId) return;
    registerRack.mutate({
      rackId,
      ptiMaterialId: 'PTI-001',
      operatorId: user?.id || 'OP-100'
    });
  };

  if (isNewRackRoute) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <PackagePlus className="text-indigo-600" size={32} />
            Inicializar Nuevo Rack
          </h1>
          <p className="text-slate-600 mt-2">Registra un Rack físico en la Extrusión para comenzar a recibir carretes.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <form onSubmit={handleRegisterRack} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">QR Virgen del Rack</label>
              <div className="relative">
                <QrCode size={16} className="absolute left-3 top-3 text-slate-400" />
                <input type="text" required value={rackId || qrFromUrl} onChange={e => setRackId(e.target.value)} className="w-full border-2 rounded-lg pl-9 pr-3 py-2 font-mono uppercase focus:border-indigo-500" placeholder="Escanea QR" />
              </div>
            </div>
            <button type="submit" disabled={registerRack.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
              {registerRack.isPending ? <Loader2 className="animate-spin" size={20} /> : <PackagePlus size={20} />} Inicializar Rack
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Settings2 className="text-blue-600" size={32} />
          Terminal de Extrusión
        </h1>
        <p className="text-slate-600 mt-2">Alimenta la extrusora con un Batch de Mezcla y registra salidas parciales en Racks.</p>
      </div>

      {/* Panel 1: Alimentación */}
      <div className={`p-6 border-2 rounded-2xl transition-all ${extrusionId ? 'bg-slate-50 border-emerald-500' : 'bg-white shadow-xl border-slate-200'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          1. Alimentación de Máquina
          {extrusionId && <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full uppercase">Corriendo</span>}
        </h2>
        
        <form onSubmit={handleStart} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Receta</label>
            <input type="text" value={recipeId} onChange={e => setRecipeId(e.target.value)} disabled={!!extrusionId} className="w-full border rounded-lg px-3 py-2 bg-slate-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Estación</label>
            <input type="text" value={stationId} onChange={e => setStationId(e.target.value)} disabled={!!extrusionId} className="w-full border rounded-lg px-3 py-2 bg-slate-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">QR Mezcla (MixBatch)</label>
            <div className="relative">
              <QrCode size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="text" required value={feedQr} onChange={e => setFeedQr(e.target.value)} disabled={!!extrusionId} className="w-full border-2 rounded-lg pl-9 pr-3 py-2 font-mono uppercase bg-yellow-50 focus:border-blue-500" placeholder="Escanea Mezcla" />
            </div>
          </div>
          {!extrusionId && (
            <div className="md:col-span-3 flex justify-end mt-2">
              <button type="submit" disabled={startExtrusion.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2">
                {startExtrusion.isPending ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />} Iniciar Extrusión
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Panel 2: Salidas Parciales (Racks) */}
      <div className={`p-6 border-2 rounded-2xl transition-all ${!extrusionId ? 'opacity-50 pointer-events-none bg-slate-50 border-slate-200' : 'bg-white shadow-xl border-blue-500'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          2. Registro de Carretes en Rack
        </h2>

        <form onSubmit={handleRegisterRoll} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">QR del Rack Destino</label>
              <div className="relative">
                <Layers size={16} className="absolute left-3 top-3 text-blue-400" />
                <input type="text" required value={rackId} onChange={e => setRackId(e.target.value)} className="w-full border-2 border-blue-200 rounded-lg pl-9 pr-3 py-2 font-mono uppercase focus:border-blue-500" placeholder="Ej. RACK-QR-01" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">QR Virgen (Nuevo Carrete)</label>
              <div className="relative">
                <QrCode size={16} className="absolute left-3 top-3 text-slate-400" />
                <input type="text" required value={rollQr} onChange={e => setRollQr(e.target.value)} className="w-full border-2 rounded-lg pl-9 pr-3 py-2 font-mono uppercase bg-yellow-50 focus:border-blue-500" placeholder="Escanea QR Virgen" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Peso del Carrete (KG)</label>
              <input type="number" required value={rollQty} onChange={e => setRollQty(Number(e.target.value))} className="w-full border-2 rounded-lg px-4 py-3 text-2xl font-bold font-mono focus:border-blue-500" />
            </div>
            <button type="submit" disabled={registerRoll.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg h-[60px] flex items-center gap-2">
              {registerRoll.isPending ? <Loader2 className="animate-spin" size={20} /> : <Layers size={20} />} Registrar en Rack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
