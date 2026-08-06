import React, { useState, useMemo } from 'react';
import { CameraScanner } from '../../design-system/components/scanner-overlay/CameraScanner';
import { SubmitReceptionCommand } from './commands';
import { useMaterialListQuery } from '../materials/hooks/useMaterialListQuery';
import { TFCard, TFButton, TFInput, TFBadge } from '../../components/tf-ui';
import { PackageOpen, ArrowLeft, Hash, Layers, Calendar, QrCode } from 'lucide-react';
import { SearchSelect } from '../../design-system/components/Input/SearchSelect';
import { tokens } from '../../design-system/foundation/tokens';

export const ReceptionWorkspace = ({
  workflowState, // 'INITIAL' | 'SCANNING' | 'FORM_READY' | 'SUBMITTING' | 'SUCCESS'
  onDispatch,    // function para enviar transiciones a la máquina de estados
  onCommand,     // function para despachar Command Objects (Ej. SubmitReceptionCommand)
  data,          // Payload resuelto por el Runtime (Ej. { qrCode: 'QR-001', materialId?: 15, ... })
  onExit         // function para salir del módulo (volver atrás)
}) => {

  const [selectedMaterialId, setSelectedMaterialId] = useState(data?.materialId || null);
  const [quantity, setQuantity] = useState('');
  const [rack, setRack] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch materials catalogue via TanStack query
  const { data: materials = [], isLoading: isLoadingMaterials } = useMaterialListQuery();

  // Selected material logic
  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId) return null;
    return materials.find(m => m.id === selectedMaterialId || m.uuid === selectedMaterialId) || null;
  }, [materials, selectedMaterialId]);

  // Generate QR Preview
  const qrPreview = useMemo(() => {
    const baseQr = data?.qrCode || 'UNKNOWN';
    if (!selectedMaterial) return baseQr;
    
    // Attempt to get the material code (e.g. PP-001)
    const materialCode = selectedMaterial.material_code?.code || selectedMaterial.internal_code || selectedMaterial.code || 'MAT';
    
    // If QR is like ALM-000163, insert material code in the middle
    const parts = baseQr.split('-');
    if (parts.length === 2) {
      return `${parts[0]}-${materialCode}-${parts[1]}`;
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
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background p-6 text-center">
        <div className="w-24 h-24 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
          <PackageOpen className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-success m-0 mb-4">¡Recepción Exitosa!</h1>
        <p className="text-lg text-muted-foreground mb-8">El material ha sido ingresado al almacén correctamente.</p>
        <TFButton variant="primary" size="lg" onClick={() => onDispatch('RESTART')}>
          Escanear Siguiente QR
        </TFButton>
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
      rack,
      observations: notes
    }));
  };

  const isFormValid = selectedMaterialId && quantity !== '';

  // Pantalla de Captura de Datos (FORM_READY / SUBMITTING)
  return (
    <div className="flex flex-col h-full bg-background relative pb-24">
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
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:max-w-4xl lg:mx-auto lg:w-full">
        
        {/* Selección de Material */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Material a Recepcionar
          </label>
          <SearchSelect
            options={materials}
            value={selectedMaterialId}
            onChange={setSelectedMaterialId}
            getLabel={(m) => m.material_code?.code ? `${m.material_code.code} - ${m.name}` : m.name}
            getValue={(m) => m.id || m.uuid}
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
                  Cantidad Recibida <span className="text-danger">*</span>
                </label>
                <div className="flex gap-2">
                  <TFInput 
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    disabled={workflowState === 'SUBMITTING'}
                    placeholder="Ej. 1000"
                    className="flex-1"
                  />
                  <div className="bg-muted border border-border rounded-lg px-4 flex items-center justify-center font-medium text-muted-foreground shrink-0 min-w-[80px]">
                    {selectedMaterial.default_unit?.code || selectedMaterial.base_unit_id ? 'KG' : '—'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Rack / Localidad</label>
                <TFInput 
                  value={rack}
                  onChange={e => setRack(e.target.value)}
                  disabled={workflowState === 'SUBMITTING'}
                  placeholder="Ej. A-01"
                  icon={Layers}
                />
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
      </main>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.1)] flex justify-end gap-3 z-20">
        <TFButton 
          variant="outline" 
          onClick={() => onDispatch('CANCEL')} 
          disabled={workflowState === 'SUBMITTING'}
          className="min-w-[120px]"
        >
          Cancelar
        </TFButton>
        <TFButton 
          variant="primary" 
          onClick={handleSave}
          disabled={!isFormValid || workflowState === 'SUBMITTING'}
          className="min-w-[120px]"
        >
          {workflowState === 'SUBMITTING' ? 'Guardando...' : 'Guardar'}
        </TFButton>
      </div>
    </div>
  );
};
