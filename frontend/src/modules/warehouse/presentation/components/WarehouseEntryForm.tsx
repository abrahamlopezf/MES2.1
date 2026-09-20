import React, { useState, useRef, useEffect } from 'react';
import { useWarehouseEntry } from '../hooks/useWarehouseEntry';
import { useMaterialsQuery, useSuppliersQuery } from '../../../materials/hooks/useMaterialsQueries';
import { PackagePlus, QrCode, MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useConfirmAction } from '../../../../providers/ConfirmProvider';
import { toast } from 'sonner';

export const WarehouseEntryForm: React.FC = () => {
  const mutation = useWarehouseEntry();
  const { confirm } = useConfirmAction();
  const { data: materialsData, isLoading: loadingMaterials } = useMaterialsQuery({});
  const materials = materialsData?.items || [];

  const [qrCode, setQrCode] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [locationId, setLocationId] = useState('ALMACEN-PRINCIPAL');
  const [folio, setFolio] = useState('');
  
  const qrInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Enfoque automático al cargar
  useEffect(() => {
    qrInputRef.current?.focus();
  }, []);

  const { data: rawSuppliers = [], isLoading: loadingSuppliers } = useSuppliersQuery({ pageSize: 10000 });
  
  const suppliers = (Array.isArray(rawSuppliers.data) ? rawSuppliers.data : rawSuppliers).sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode || !materialId || !amount || Number(amount) <= 0 || !folio) {
      toast.error('Complete todos los campos correctamente (incluyendo folio).');
      return;
    }

    confirm({
      title: 'Registrar Entrada',
      message: `¿Confirmas la entrada de ${amount} unidades al almacén?`,
      confirmText: 'Sí, registrar',
      variant: 'primary',
      action: async () => {
        try {
          await mutation.mutateAsync({
            qr_code: qrCode,
            material_id: Number(materialId),
            quantity: Number(amount),
            location: locationId,
            supplier_id: supplierId ? Number(supplierId) : null,
            folio: folio
          });
          toast.success('Entrada registrada exitosamente.');
          setQrCode('');
          setAmount('');
          setFolio('');
          setSupplierId('');
          setSearchTerm('');
          qrInputRef.current?.focus();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Error al registrar entrada.');
          qrInputRef.current?.focus();
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-8 rounded-2xl shadow-lg border border-border max-w-5xl mx-auto animate-form-field" style={{ '--stagger': 1 } as React.CSSProperties}>
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-4 rounded-xl text-primary-foreground shadow-sm">
            <PackagePlus size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">RECEPCIÓN DE MATERIAL</h2>
            <p className="text-muted-foreground font-medium text-lg mt-1">Escanee la etiqueta para iniciar el registro</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg border border-border">
            <MapPin size={20} className="text-slate-500" />
            <select 
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="bg-transparent border-none font-bold text-foreground outline-none text-lg"
            >
              <option value="ALMACEN-PRINCIPAL">ALMACEN-PRINCIPAL</option>
              <option value="CUARENTENA">CUARENTENA</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-10">
        {/* ESCANEO QR */}
        <div className="bg-background rounded-2xl p-8 border border-border animate-form-field" style={{ '--stagger': 2 } as React.CSSProperties}>
          <label className="block text-xl font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
            <QrCode size={24} className="text-primary" /> 1. Escanear Etiqueta (QR Virgen)
          </label>
          <input 
            ref={qrInputRef}
            type="text" 
            required
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyDown={handleQrKeyPress}
            className="w-full min-h-[48px] border border-border rounded-2xl px-6 py-4 text-2xl text-foreground focus:ring-0 focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 outline-none uppercase font-mono font-black tracking-widest bg-card transition-all placeholder:text-muted-foreground/60"
            placeholder="ESCANEE EL CÓDIGO QR"
            autoComplete="off"
          />
        </div>

        {/* MATERIAL Y CANTIDAD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-background rounded-2xl p-8 border border-border animate-form-field" style={{ '--stagger': 3 } as React.CSSProperties}>
            <label className="block text-xl font-bold text-foreground mb-3 uppercase tracking-wide">
              2. Material Recibido
            </label>
            {loadingMaterials ? (
              <div className="h-20 flex items-center justify-center gap-3 text-muted-foreground font-bold text-lg">
                <Loader2 className="animate-spin" size={24} /> Cargando catálogo...
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Buscador Inteligente (Ej. PLAS-BOLS-001 o Bobina...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full min-h-[48px] border border-border rounded-2xl px-4 py-3 text-base font-semibold text-foreground focus:ring-0 focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 outline-none bg-card transition-all placeholder:text-muted-foreground/60"
                />
                <select
                  id="material-select"
                  required
                  value={materialId}
                  onChange={handleMaterialChange}
                  className="w-full min-h-[48px] border border-border rounded-2xl px-4 py-3 text-base font-semibold text-foreground focus:ring-0 focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 outline-none bg-card transition-all cursor-pointer"
                >
                  <option value="" disabled>-- SELECCIONE MATERIAL --</option>
                  {filteredMaterials?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
                {filteredMaterials.length === 0 && (
                  <span className="text-sm text-destructive font-bold">No se encontraron materiales.</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-background rounded-2xl p-8 border border-border animate-form-field" style={{ '--stagger': 4 } as React.CSSProperties}>
            <label className="block text-xl font-bold text-foreground mb-3 uppercase tracking-wide">
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
              className="w-full border-2 border-input rounded-xl px-6 py-6 text-4xl font-black text-foreground focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none font-mono bg-card shadow-sm transition-all"
              placeholder="0.000"
            />
          </div>

          <div className="bg-background rounded-2xl p-8 border border-border animate-form-field" style={{ '--stagger': 5 } as React.CSSProperties}>
            <label className="block text-xl font-bold text-foreground mb-3 uppercase tracking-wide">
              4. Proveedor (Opcional)
            </label>
            {loadingSuppliers ? (
              <div className="h-20 flex items-center justify-center gap-3 text-muted-foreground font-bold text-lg">
                <Loader2 className="animate-spin" size={24} /> Cargando catálogo...
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full min-h-[48px] border border-border rounded-2xl px-4 py-3 text-xl font-bold text-foreground focus:ring-0 focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 outline-none bg-card transition-all cursor-pointer"
              >
                <option value="">-- SELECCIONE PROVEEDOR --</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || loadingMaterials || !qrCode || !materialId || !amount}
        className="w-full bg-primary hover:bg-primary/90 active:scale-[0.99] text-primary-foreground font-black text-3xl tracking-wide py-8 rounded-2xl shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed animate-form-field" style={{ '--stagger': 6 } as React.CSSProperties}
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
