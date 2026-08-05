import React, { useEffect, useState } from 'react';
import { UniversalActionBar } from '../../design-system/components/action-bar/UniversalActionBar';
import { ActionButton } from '../../design-system/components/Button/ActionButton';
import { DataCard } from '../../design-system/components/Card/DataCard';
import { StatusChip } from '../../design-system/components/chip/StatusChip';
import { CameraScanner } from '../../design-system/components/scanner-overlay/CameraScanner';
import { Input } from '../../design-system/components/Input/Input';
import { tokens } from '../../design-system/foundation/tokens';
import { SubmitReceptionCommand } from './ReceptionCommands';

export const ReceptionWorkspace = ({
  workflowState, // 'INITIAL' | 'SCANNING' | 'FORM_READY' | 'SUBMITTING' | 'SUCCESS'
  onDispatch,    // function para enviar transiciones a la máquina de estados
  onCommand,     // function para despachar Command Objects (Ej. SubmitReceptionCommand)
  data,          // Payload resuelto por el Runtime (Ej. { material: 'PP-001', lote: 'L-123' })
  onExit         // function para salir del módulo (volver atrás)
}) => {

  const [quantity, setQuantity] = useState('');
  const [rack, setRack] = useState('');
  const [notes, setNotes] = useState('');

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
        
        {/* Banner QR */}
        <div style={{ backgroundColor: tokens.primitive.colors.zinc800, padding: tokens.primitive.spacing['24'], borderRadius: tokens.primitive.spacing['12'], textAlign: 'center', marginBottom: tokens.primitive.spacing['24'] }}>
          <h2 style={{ margin: 0, color: tokens.semantic.color.textHighEmphasis }}>QR Escaneado</h2>
        </div>

        {/* Info de Material (Solo vista) */}
        <DataCard
          title={data?.materialName || "Polipropileno (PP-001)"}
          subtitle={`Proveedor: ${data?.provider || 'SABIC'}`}
          status="AVAILABLE"
          headerRight={<StatusChip status="AVAILABLE" />}
          style={{ marginBottom: tokens.primitive.spacing['24'] }}
          data={{
             'Lote Prov': data?.lote || 'L-999',
             'Fecha': new Date().toLocaleDateString()
          }}
        />

        {/* Inputs del Operador */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.primitive.spacing['24'] }}>
          <Input 
            label="Cantidad (kg)" 
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
            onClick={() => {
              // 1. Decirle a la máquina de estados que intente someter (para que cambie la UI)
              onDispatch('SUBMIT');
              // 2. Despachar el Comando de Negocio, el Runtime sabrá qué hacer
              onCommand(new SubmitReceptionCommand(data?.materialId, quantity, rack, notes));
            }}
          >
            Guardar
          </ActionButton>
        ]}
      />
    </div>
  );
};
