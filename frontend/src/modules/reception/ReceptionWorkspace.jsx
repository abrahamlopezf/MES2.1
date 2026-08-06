import React, { useState, useMemo } from 'react';
import { UniversalActionBar } from '../../design-system/components/action-bar/UniversalActionBar';
import { ActionButton } from '../../design-system/components/Button/ActionButton';
import { DataCard } from '../../design-system/components/Card/DataCard';
import { StatusChip } from '../../design-system/components/chip/StatusChip';
import { CameraScanner } from '../../design-system/components/scanner-overlay/CameraScanner';
import { Input } from '../../design-system/components/Input/Input';
import { SearchSelect } from '../../design-system/components/Input/SearchSelect';
import { tokens } from '../../design-system/foundation/tokens';
import { SubmitReceptionCommand } from './ReceptionCommands';
import { useMaterialListQuery } from '../materials/hooks/useMaterialListQuery';

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

  // Selected material logic (Dumb DataCard source)
  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId) return null;
    return materials.find(m => m.id === selectedMaterialId) || null;
  }, [materials, selectedMaterialId]);

  // Fase de Escaneo (Pantalla Completa)
  if (workflowState === 'INITIAL' || workflowState === 'SCANNING') {
    return (
      <CameraScanner 
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
      <div style={{ padding: tokens.primitive.spacing['24'], textAlign: 'center', marginTop: '100px' }}>
        <h1 style={{ fontSize: tokens.primitive.typography.sizes.xxl, color: tokens.semantic.color.success }}>✅ ¡Recepción Exitosa!</h1>
        <p style={{ margin: '24px 0', color: tokens.semantic.color.textMediumEmphasis }}>El material ha sido ingresado al almacén.</p>
        <ActionButton variant="primary" onClick={() => onDispatch('RESTART')}>
          Escanear Siguiente
        </ActionButton>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: tokens.semantic.color.background }}>
      {/* Header Fijo */}
      <header style={{ padding: tokens.primitive.spacing['16'], borderBottom: `1px solid ${tokens.semantic.color.borderDefault}`, display: 'flex', alignItems: 'center', gap: tokens.primitive.spacing['16'] }}>
        <button onClick={() => onDispatch('CANCEL')} style={{ background: 'transparent', border: 'none', color: tokens.semantic.color.textHighEmphasis, fontSize: '24px', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: tokens.primitive.typography.sizes.lg, margin: 0 }}>Recepción</h1>
        <span style={{ marginLeft: 'auto', color: tokens.semantic.color.textMediumEmphasis, fontFamily: 'monospace' }}>
          {data?.qrCode || 'QR-UNKNOWN'}
        </span>
      </header>

      {/* Contenido (Scrollable) */}
      <main style={{ flex: 1, overflowY: 'auto', padding: tokens.primitive.spacing['16'], paddingBottom: '120px' }}>
        
        {/* Selection / Catalogue Integration */}
        <div style={{ marginBottom: tokens.primitive.spacing['24'] }}>
          <label style={{ display: 'block', color: tokens.semantic.color.textMediumEmphasis, marginBottom: tokens.primitive.spacing['8'], fontSize: tokens.primitive.typography.sizes.sm }}>
            Material a Recepcionar
          </label>
          <SearchSelect
            options={materials}
            value={selectedMaterialId}
            onChange={setSelectedMaterialId}
            getLabel={(m) => m.name}
            getValue={(m) => m.id}
            searchable={true}
            placeholder="Buscar material..."
            loading={isLoadingMaterials}
            emptyMessage="Sin resultados"
            disabled={workflowState === 'SUBMITTING'}
          />
        </div>

        {/* Info de Material (Solo vista) */}
        {selectedMaterial && (
          <DataCard
            title={selectedMaterial.name}
            subtitle={selectedMaterial.brand?.name ? `Marca: ${selectedMaterial.brand.name}` : `Familia: ${selectedMaterial.family?.name || 'Genérico'}`}
            status="AVAILABLE"
            headerRight={<StatusChip status="AVAILABLE" />}
            style={{ marginBottom: tokens.primitive.spacing['24'] }}
            data={{
               'Código Interno': selectedMaterial.internal_code,
               'Unidad': selectedMaterial.base_unit_id ? 'KG' : '—', // Fallback neutro
               'Fecha': data?.activatedAt ? new Date(data.activatedAt).toLocaleDateString() : new Date().toLocaleDateString()
            }}
          />
        )}

        {/* Inputs del Operador */}
        {selectedMaterial && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.primitive.spacing['24'] }}>
            <Input 
              label="Cantidad" 
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              disabled={workflowState === 'SUBMITTING'}
              placeholder="Ej. 1000"
            />
            <Input 
              label="Rack" 
              value={rack}
              onChange={e => setRack(e.target.value)}
              disabled={workflowState === 'SUBMITTING'}
              placeholder="Ej. A-01"
            />
            <Input 
              label="Observaciones (Opcional)" 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={workflowState === 'SUBMITTING'}
              placeholder="Ej. Empaque dañado"
            />
          </div>
        )}
      </main>

      {/* Acciones fijas al fondo */}
      <UniversalActionBar 
        secondaryActions={[
          <ActionButton key="cancel" variant="ghost" onClick={() => onDispatch('CANCEL')} disabled={workflowState === 'SUBMITTING'}>
            Cancelar
          </ActionButton>
        ]}
        primaryActions={[
          <ActionButton 
            key="save" 
            variant="primary" 
            loading={workflowState === 'SUBMITTING'}
            disabled={!isFormValid || workflowState === 'SUBMITTING'}
            onClick={handleSave}
          >
            Guardar
          </ActionButton>
        ]}
      />
    </div>
  );
};
