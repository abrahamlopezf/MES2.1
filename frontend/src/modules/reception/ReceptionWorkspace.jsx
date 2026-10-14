import React, { useState, useMemo } from 'react';
import { CameraScanner } from '../../design-system/components/scanner-overlay/CameraScanner';
import { SubmitReceptionCommand } from './commands';
import { useMaterialListQuery } from '../materials/hooks/useMaterialListQuery';
import { useOperationalAreasQuery, useSuppliersQuery } from '../materials/hooks/useMaterialsQueries';
import { TFCard, TFButton, TFInput, TFBadge, TFSelect } from '../../components/tf-ui';
import { PackageOpen, ArrowLeft, Hash, Layers, Calendar, QrCode, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { SearchSelect } from '../../design-system/components/Input/SearchSelect';
import { tokens } from '../../design-system/foundation/tokens';
import { useNavigate, Link } from 'react-router-dom';

export const ReceptionWorkspace = ({
  workflowState, // 'INITIAL' | 'SCANNING' | 'FORM_READY' | 'SUBMITTING' | 'SUCCESS'
  onDispatch,    // function para enviar transiciones a la máquina de estados
  onCommand,     // function para despachar Command Objects (Ej. SubmitReceptionCommand)
  data,          // Payload resuelto por el Runtime (Ej. { qrCode: 'QR-001', materialId?: 15, ... })
  onExit         // function para salir del módulo (volver atrás)
}) => {

  const [selectedMaterialId, setSelectedMaterialId] = useState(data?.materialId || null);
  const [quantity, setQuantity] = useState('');
  const [folio, setFolio] = useState('');
  const [rack, setRack] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    if (workflowState === 'SUCCESS' && (!data?.created_catalogs || data.created_catalogs.length === 0)) {
      // Breve delay para que el usuario pueda ver el estado de éxito si es muy rápido
      const t = setTimeout(() => {
        navigate('/warehouse/inventory');
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [workflowState, navigate, data?.created_catalogs]);

  // Fetch materials catalogue via TanStack query
  const { data: materials = [], isLoading: isLoadingMaterials } = useMaterialListQuery();

  // Fetch operational areas
  const { data: operationalAreasData = { items: [] }, isLoading: isLoadingAreas } = useOperationalAreasQuery({ pageSize: 10000 });
  const operationalAreas = useMemo(() => {
    const items = operationalAreasData.items || [];
    return [...items].sort((a, b) => 
      (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [operationalAreasData]);

  // Fetch suppliers
  const { data: suppliersData = { items: [] }, isLoading: isLoadingSuppliers } = useSuppliersQuery({ pageSize: 10000 });
  const suppliers = useMemo(() => {
    const items = suppliersData.items || [];
    return [...items].sort((a, b) => 
      (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [suppliersData]);

  // Selected material logic
  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId) return null;
    return materials.find(m => m.id === selectedMaterialId || m.uuid === selectedMaterialId) || null;
  }, [materials, selectedMaterialId]);

  // Generate QR Preview
  const qrPreview = useMemo(() => {
    let baseQr = data?.qrCode;
    // Si no hay QR o dice UNKNOWN, usamos un placeholder genérico
    if (!baseQr || baseQr === 'UNKNOWN' || baseQr === 'QR-UNKNOWN') {
      baseQr = 'ALM-XXXX';
    }
    
    if (!selectedMaterial) return baseQr;
    
    // Prefer internal_code to get the consecutive (e.g. BAL-001 or FAM-BAL-001)
    const materialCode = selectedMaterial.internal_code || selectedMaterial.material_code?.code || selectedMaterial.code || 'MAT';
    
    // If QR is like ALM-000163, insert material code in the middle
    const parts = baseQr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${materialCode}-${parts.slice(1).join('-')}`;
    }
    
    return `${baseQr}-${materialCode}`;
  }, [data?.qrCode, selectedMaterial]);

  // Fase de Escaneo (Pantalla Completa)
  if (workflowState === 'INITIAL' || workflowState === 'SCANNING') {
    return (
      <CameraScanner 
        title="Recepción de Material"
        onScan={(code) => {
          onDispatch('QR_SCANNED');
          onCommand({ type: 'RESOLVE_QR_COMMAND', payload: { qrCode: code } });
        }}
        onClose={onExit}
      />
    );
  }

  // Pantalla de Éxito
  if (workflowState === 'SUCCESS') {
    const createdCatalogs = data?.created_catalogs || [];
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-full bg-background p-6 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
          <PackageOpen className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-foreground m-0 mb-2">¡Recepción Exitosa!</h1>
        <p className="text-sm text-muted-foreground mb-6">El material y su lote se registraron correctamente en el inventario.</p>

        {createdCatalogs.length > 0 ? (
          <div className="w-full text-left space-y-3 mb-6 bg-card border border-border rounded-2xl p-4 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span>Nuevo registro maestro generado:</span>
            </div>
            
            {createdCatalogs.map((cat, idx) => (
              <div key={idx} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors">
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    {cat.catalog || cat.entity || 'Proveedores'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-foreground truncate">{cat.name}</span>
                    {cat.code && (
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                        {cat.code}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to={cat.path || '/materials/suppliers'}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                >
                  <span>Completar</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            ))}

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-snug m-0">
                <strong>Recordatorio Operativo:</strong> Por favor pasa al subcatálogo correspondiente para completar los datos faltantes (RFC, contacto, teléfono, etc.).
              </p>
            </div>

            <TFButton
              variant="primary"
              onClick={() => navigate('/warehouse/inventory')}
              className="w-full h-11 text-sm font-bold mt-2"
            >
              Continuar al Inventario
            </TFButton>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Redirigiendo al Inventario...</p>
        )}
      </div>
    );
  }

  const handleSave = () => {
    if (!selectedMaterialId) return;
    onDispatch('SUBMIT');
    onCommand(new SubmitReceptionCommand({
      qrCode: data?.qrCode,
      materialId: selectedMaterialId,
      quantity: Number(quantity),
      folio,
      rack,
      supplierId: supplierId ? (String(supplierId).startsWith('NEW:') ? supplierId : Number(supplierId)) : undefined,
      observations: notes,
      unitCost: unitCost ? Number(unitCost) : undefined,
      totalCost: totalCost ? Number(totalCost) : undefined
    }));
  };

  const handleQuantityChange = (val) => {
    setQuantity(val);
    const q = Number(val);
    if (q > 0 && unitCost) {
      setTotalCost((q * Number(unitCost)).toFixed(2));
    } else if (q > 0 && totalCost) {
      setUnitCost((Number(totalCost) / q).toFixed(4));
    }
  };

  const handleUnitCostChange = (val) => {
    setUnitCost(val);
    const q = Number(quantity);
    if (q > 0 && val !== '') {
      setTotalCost((q * Number(val)).toFixed(2));
    }
  };

  const handleTotalCostChange = (val) => {
    setTotalCost(val);
    const q = Number(quantity);
    if (q > 0 && val !== '') {
      setUnitCost((Number(val) / q).toFixed(4));
    }
  };

  const isFormValid = selectedMaterialId && quantity !== '' && folio.trim() !== '' && rack !== '' && unitCost !== '' && Number(unitCost) >= 0 && totalCost !== '' && Number(totalCost) >= 0;

  // Pantalla de Captura de Datos (FORM_READY / SUBMITTING)
  return (
    <div className="flex flex-col h-full bg-background relative pb-24 overflow-y-auto">
      {/* Header Fijo */}
      <header className="px-4 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onDispatch('CANCEL')} 
            className="p-2 hover:bg-muted rounded-full transition-colors border-none bg-transparent cursor-pointer text-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground m-0 leading-tight">Recepción</h1>
            <p className="text-sm text-muted-foreground m-0">Registrar nuevo material</p>
          </div>
        </div>
        <div className="bg-muted px-3 py-1.5 rounded-md flex items-center gap-2 border border-border">
          <QrCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono font-medium text-foreground">{data?.qrCode || 'UNKNOWN'}</span>
        </div>
      </header>

      {/* Contenido (Scrollable) */}
      <main className="flex-1 p-4 md:p-6 lg:max-w-4xl lg:mx-auto lg:w-full">
        
        {/* Selección de Material */}
        <div className="mb-6 z-[40] relative">
          <label className="block text-sm font-medium text-foreground mb-2">
            Material a Recepcionar
          </label>
          <SearchSelect
            options={materials}
            value={selectedMaterialId}
            onChange={setSelectedMaterialId}
            getLabel={(m) => {
              const code = m.internal_code || m.material_code?.code || '';
              const cat = m.category?.code ? `${m.category.code} ` : '';
              return `${cat}${code} - ${m.name}`;
            }}
            getValue={(m) => m.id}
            searchable={true}
            placeholder="Buscar por código o nombre..."
            loading={isLoadingMaterials}
            emptyMessage="Sin resultados"
            disabled={workflowState === 'SUBMITTING'}
          />
        </div>

        {selectedMaterial && (
          <div className="space-y-6">
            
            {/* Vista Previa del Código Generado */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Vista Previa QR Final</span>
              <span className="text-lg md:text-xl font-mono font-bold text-foreground break-all">
                {qrPreview}
              </span>
            </div>

            {/* Info de Material (Solo vista) */}
            <TFCard className="!p-0 overflow-hidden border-border/50">
              <div className="bg-card p-5 border-b border-border/50 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-foreground m-0 mb-1">{selectedMaterial.name}</h3>
                  <p className="text-sm text-muted-foreground m-0">
                    {selectedMaterial.brand?.name ? `Marca: ${selectedMaterial.brand.name}` : `Familia: ${selectedMaterial.family?.name || 'Genérico'}`}
                  </p>
                </div>
                <TFBadge variant="success">Disponible</TFBadge>
              </div>
              <div className="bg-muted/30 p-5 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Código</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                    {selectedMaterial.material_code?.code || selectedMaterial.internal_code || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Fecha</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {data?.activatedAt ? new Date(data.activatedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </TFCard>

            {/* Inputs del Operador */}
            <div className="space-y-4 bg-card p-5 rounded-xl border border-border shadow-sm">
              <h4 className="text-base font-semibold text-foreground m-0 mb-4">Datos de Recepción</h4>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Folio de Factura (Lote) <span className="text-danger">*</span>
                </label>
                <TFInput 
                  type="text"
                  value={folio}
                  onChange={e => setFolio(e.target.value)}
                  disabled={workflowState === 'SUBMITTING'}
                  placeholder="Ej. FAC-2023-001"
                />
              </div>

              <div className="z-[35] relative">
                <TFSelect
                  label="Proveedor (Opcional)"
                  hint="Razón Social del Proveedor"
                  name="supplier"
                  placeholder="Ej. DISTRIBUIDORA INDUSTRIAL S.A. DE C.V."
                  searchPlaceholder="Buscar o escribir Razón Social (ej. ACME S.A. DE C.V.)..."
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  options={suppliers.map(s => ({
                    value: String(s.id),
                    label: `${s.code} - ${s.name}`
                  }))}
                  allowCreate={true}
                  createLabel="Registrar Razón Social"
                  disabled={workflowState === 'SUBMITTING'}
                  helperText={!supplierId?.startsWith('NEW:') ? "Ingresa la Razón Social completa de la empresa según factura" : undefined}
                />
                {supplierId?.startsWith('NEW:') && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500 shrink-0" />
                    <span className="truncate">Nueva Razón Social: <strong>{supplierId.replace('NEW:', '')}</strong></span>
                  </span>
                )}
              </div>

              <div className="z-[30] relative">
                <label className="block text-sm font-medium text-foreground mb-1.5">Rack / Localidad</label>
                <SearchSelect
                  options={operationalAreas}
                  value={rack}
                  onChange={setRack}
                  getLabel={(a) => `${a.code} - ${a.name}`}
                  getValue={(a) => a.id}
                  searchable={true}
                  placeholder="Seleccionar localidad..."
                  loading={isLoadingAreas}
                  emptyMessage="Sin localidades disponibles"
                  disabled={workflowState === 'SUBMITTING'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Cantidad Recibida <span className="text-danger">*</span>
                </label>
                <div className="flex gap-2">
                  <TFInput 
                    type="number"
                    value={quantity}
                    onChange={e => handleQuantityChange(e.target.value)}
                    disabled={workflowState === 'SUBMITTING'}
                    placeholder="Ej. 1000"
                    className="flex-1"
                  />
                  <div className="bg-muted border border-border rounded-lg px-4 flex items-center justify-center font-medium text-muted-foreground shrink-0 min-w-[80px]">
                    {selectedMaterial.default_unit?.code || selectedMaterial.base_unit_id ? 'KG' : '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Costo Unitario *
                  </label>
                  <TFInput 
                    type="number"
                    value={unitCost}
                    onChange={e => handleUnitCostChange(e.target.value)}
                    disabled={workflowState === 'SUBMITTING'}
                    placeholder="Ej. 12.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Costo Total *
                  </label>
                  <TFInput 
                    type="number"
                    value={totalCost}
                    disabled={true}
                    placeholder="Ej. 12500.00"
                    className="opacity-70 cursor-not-allowed bg-muted"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Observaciones</label>
                <TFInput 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={workflowState === 'SUBMITTING'}
                  placeholder="Ej. Empaque dañado"
                />
              </div>
            </div>
          </div>
        )}
        {/* AVISO PREVIO SI HAY PROVEEDOR NUEVO */}
        {supplierId?.startsWith('NEW:') && (
          <div className="mx-4 sm:mx-6 mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block text-foreground">
                Se creará un nuevo proveedor automáticamente
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                Al guardar esta recepción, el proveedor <strong>"{supplierId.replace('NEW:', '')}"</strong> se registrará en el catálogo maestro. Recuerda ingresar al subcatálogo de Proveedores para completar la información restante.
              </span>
            </div>
          </div>
        )}

      </main>

      {/* Action Bar */}
      <div className="sticky bottom-0 mt-auto p-4 sm:p-6 bg-card border-t border-border/30 shadow-[0_-12px_40px_-5px_rgba(0,0,0,0.15)] flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 shrink-0 z-[20] lg:rounded-b-2xl">
        <TFButton 
          variant="outline" 
          onClick={() => onDispatch('CANCEL')} 
          disabled={workflowState === 'SUBMITTING'}
          className="w-full sm:w-[140px] h-14 sm:h-12 text-base font-semibold border-2 rounded-xl"
        >
          Cancelar
        </TFButton>
        <TFButton 
          variant="primary" 
          onClick={handleSave}
          disabled={!isFormValid || workflowState === 'SUBMITTING'}
          className="w-full sm:w-auto sm:min-w-[200px] h-14 sm:h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/25"
        >
          {workflowState === 'SUBMITTING' ? 'Guardando...' : 'Guardar Material'}
        </TFButton>
      </div>
    </div>
  );
};
