import React, { useState } from 'react';
import { useWarehouseEntry } from '../hooks/useWarehouseEntry';
import { useMaterials } from '../../../catalog/presentation/hooks/useCatalog';
import { PackagePlus, QrCode, User, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { UnitOfMeasure } from '../../catalog/domain/valueObjects/UnitOfMeasure';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../identity/presentation/context/AuthContext';

export const WarehouseEntryForm: React.FC = () => {
  const mutation = useWarehouseEntry();
  const { data: materials, isLoading: loadingMaterials } = useMaterials();

  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const qrFromUrl = searchParams.get('qr') || '';

  const [identityTokenId, setIdentityTokenId] = useState(qrFromUrl);
  const [materialId, setMaterialId] = useState('');
  const [amount, setAmount] = useState(100);
  const [locationId, setLocationId] = useState('ALMACEN-PRINCIPAL');
  const [operatorId, setOperatorId] = useState(user?.id || 'OP-101');

  const selectedMaterial = materials?.find(m => m.id === materialId);
  const currentUnit = selectedMaterial?.defaultUnit || 'KG';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityTokenId || !materialId || amount <= 0 || !locationId || !operatorId) return;

    mutation.mutate({
      identityTokenId,
      materialId,
      amount,
      unit: currentUnit as UnitOfMeasure,
      locationId,
      operatorId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
          <PackagePlus size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Recepción de Material (Almacén)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <QrCode size={16} /> Identidad & Ubicación
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Identity Token (QR Virgen)</label>
            <input 
              type="text" 
              required
              value={identityTokenId}
              onChange={(e) => setIdentityTokenId(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono bg-yellow-50"
              placeholder="Escanee QR"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación (Rack/Zona)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin size={16} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
              />
            </div>
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
                className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <PackagePlus size={16} /> Carga de Inventario
          </h3>
          
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Material de Catálogo</label>
              {loadingMaterials ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Cargando catálogo...
                </div>
              ) : (
                <select
                  required
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="" disabled>-- Seleccione un Material --</option>
                  {materials?.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad Recibida</label>
                <input 
                  type="number" 
                  min="0.1"
                  step="0.1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                <input 
                  type="text" 
                  disabled
                  value={currentUnit}
                  className="w-full border border-slate-200 bg-slate-100 rounded px-3 py-2 text-lg text-slate-500 text-center font-bold"
                />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
              <AlertCircle size={12} /> Se creará una unidad de stock trazable (StockUnit).
            </p>
          </div>
        </div>
      </div>

      {mutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-sm">Fallo al registrar entrada</p>
            <p className="text-sm mt-1">{mutation.error.message}</p>
          </div>
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Entrada Registrada Exitosamente</p>
            <p className="text-sm mt-1 opacity-90">StockUnit ID: {mutation.data.stockUnitId}</p>
          </div>
          <div className="bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
            {mutation.data.status}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || loadingMaterials}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-lg py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="animate-spin" size={24} /> Registrando en Almacén...
          </>
        ) : (
          <>
            <PackagePlus size={24} /> INGRESAR MATERIAL
          </>
        )}
      </button>
    </form>
  );
};
