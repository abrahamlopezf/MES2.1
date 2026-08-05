import React, { useState, useRef, useEffect } from 'react';
import { useWarehouseEntry } from '../hooks/useWarehouseEntry';
import { useMaterialsQuery } from '../../../materials/hooks/useMaterialsQueries';
import { PackagePlus, QrCode, MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const WarehouseEntryForm: React.FC = () => {
  const mutation = useWarehouseEntry();
  const { data: materialsData, isLoading: loadingMaterials } = useMaterialsQuery({});
  const materials = materialsData?.items || [];

  const [qrCode, setQrCode] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [locationId, setLocationId] = useState('ALMACEN-PRINCIPAL');
  
  const qrInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Enfoque automático al cargar
  useEffect(() => {
    qrInputRef.current?.focus();
  }, []);

  const filteredMaterials = materials.filter((m: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return m.code?.toLowerCase().includes(term) || m.name?.toLowerCase().includes(term);
  });

  const handleQrKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Si ya hay material seleccionado, enfocamos la cantidad
      // De lo contrario, forzamos seleccionar material
      if (!materialId) {
        toast.info('Seleccione el material de catálogo.');
        document.getElementById('material-select')?.focus();
      } else {
        amountInputRef.current?.focus();
      }
    }
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMaterialId(e.target.value);
    amountInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode || !materialId || !amount || Number(amount) <= 0) {
      toast.error('Complete todos los campos correctamente.');
      return;
    }

    mutation.mutate(
      {
        qr_code: qrCode,
        material_id: Number(materialId),
        quantity: Number(amount),
        location: locationId,
      },
      {
        onSuccess: () => {
          toast.success('Entrada registrada exitosamente.');
          setQrCode('');
          setAmount('');
          qrInputRef.current?.focus();
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Error al registrar entrada.');
          qrInputRef.current?.focus();
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-slate-200/60 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-10 pb-6 border-b-2 border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-xl text-white shadow-md">
            <PackagePlus size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">RECEPCIÓN DE MATERIAL</h2>
            <p className="text-slate-500 font-medium text-lg mt-1">Escanee la etiqueta para iniciar el registro</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
            <MapPin size={20} className="text-slate-500" />
            <select 
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="bg-transparent border-none font-bold text-slate-700 outline-none text-lg"
            >
              <option value="ALMACEN-PRINCIPAL">ALMACEN-PRINCIPAL</option>
              <option value="CUARENTENA">CUARENTENA</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-10">
        {/* ESCANEO QR */}
        <div className="bg-slate-50 rounded-2xl p-8 border-2 border-slate-200">
          <label className="block text-xl font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <QrCode size={24} className="text-blue-600" /> 1. Escanear Etiqueta (QR Virgen)
          </label>
          <input 
            ref={qrInputRef}
            type="text" 
            required
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyDown={handleQrKeyPress}
            className="w-full border-2 border-blue-300 rounded-xl px-6 py-6 text-4xl text-slate-900 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase font-mono font-black tracking-widest bg-white shadow-inner placeholder:text-slate-300"
            placeholder="ESCANEE EL CÓDIGO QR"
            autoComplete="off"
          />
        </div>

        {/* MATERIAL Y CANTIDAD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-50 rounded-2xl p-8 border-2 border-slate-200">
            <label className="block text-xl font-bold text-slate-700 mb-3 uppercase tracking-wide">
              2. Material Recibido
            </label>
            {loadingMaterials ? (
              <div className="h-20 flex items-center justify-center gap-3 text-slate-500 font-bold text-lg">
                <Loader2 className="animate-spin" size={24} /> Cargando catálogo...
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Buscador Inteligente (Ej. PLAS-BOLS-001 o Bobina...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white shadow-sm"
                />
                <select
                  id="material-select"
                  required
                  value={materialId}
                  onChange={handleMaterialChange}
                  className="w-full border-2 border-slate-300 rounded-xl px-4 py-4 text-xl font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white shadow-sm"
                >
                  <option value="" disabled>-- SELECCIONE MATERIAL --</option>
                  {filteredMaterials?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
                {filteredMaterials.length === 0 && (
                  <span className="text-sm text-red-500 font-bold">No se encontraron materiales.</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-8 border-2 border-slate-200">
            <label className="block text-xl font-bold text-slate-700 mb-3 uppercase tracking-wide">
              3. Cantidad Recibida
            </label>
            <input 
              ref={amountInputRef}
              type="number" 
              min="0.001"
              step="0.001"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              className="w-full border-2 border-slate-300 rounded-xl px-6 py-6 text-4xl font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono bg-white shadow-inner"
              placeholder="0.000"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || loadingMaterials || !qrCode || !materialId || !amount}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-3xl tracking-wide py-8 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="animate-spin" size={36} /> REGISTRANDO...
          </>
        ) : (
          <>
            <CheckCircle2 size={36} /> GUARDAR RECEPCIÓN
          </>
        )}
      </button>
    </form>
  );
};
