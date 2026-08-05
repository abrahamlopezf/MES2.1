import React, { useState } from 'react';
import { ActionButton } from '../components/Button/ActionButton';
import { Input } from '../components/Input/Input';
import { PrimitiveCard } from '../components/Card/PrimitiveCard';
import { DataCard } from '../components/Card/DataCard';
import { StatusChip } from '../components/chip/StatusChip';
import { UniversalActionBar } from '../components/action-bar/UniversalActionBar';
import { ScannerOverlay } from '../components/scanner-overlay/ScannerOverlay';
import { tokens } from '../foundation/tokens';

export const DesignSystemPlayground = () => {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <div style={{ backgroundColor: tokens.semantic.color.background, minHeight: '100vh', color: tokens.semantic.color.textHighEmphasis, padding: tokens.primitive.spacing['24'], paddingBottom: '120px' }}>
      <h1 style={{ fontSize: tokens.primitive.typography.sizes.xxl, marginBottom: tokens.primitive.spacing['32'] }}>
        Industrial Design System v1
      </h1>

      <section style={{ marginBottom: tokens.primitive.spacing['48'] }}>
        <h2>1. ActionButton</h2>
        <div style={{ display: 'flex', gap: tokens.primitive.spacing['16'], flexWrap: 'wrap' }}>
          <ActionButton variant="primary" data-mes-action="save">Guardar</ActionButton>
          <ActionButton variant="secondary" data-mes-action="cancel">Cancelar</ActionButton>
          <ActionButton variant="danger" data-mes-action="delete">Eliminar Scrap</ActionButton>
          <ActionButton variant="ghost">Omitir</ActionButton>
          <ActionButton loading>Procesando</ActionButton>
        </div>
      </section>

      <section style={{ marginBottom: tokens.primitive.spacing['48'] }}>
        <h2>2. Input</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.primitive.spacing['16'], maxWidth: '400px' }}>
          <Input label="Código de Material" placeholder="Ej: PP-001" />
          <Input label="Lote" error="Lote inválido o expirado" defaultValue="L-999" />
        </div>
      </section>

      <section style={{ marginBottom: tokens.primitive.spacing['48'] }}>
        <h2>3. StatusChip</h2>
        <div style={{ display: 'flex', gap: tokens.primitive.spacing['16'] }}>
          <StatusChip status="AVAILABLE" />
          <StatusChip status="RESERVED" />
          <StatusChip status="BLOCKED" />
          <StatusChip status="QUARANTINE" />
          
          <StatusChip status="AVAILABLE" variant="outline" />
        </div>
      </section>

      <section style={{ marginBottom: tokens.primitive.spacing['48'] }}>
        <h2>4. DataCard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: tokens.primitive.spacing['24'] }}>
          <DataCard 
            title="Bobina Extrusión" 
            subtitle="Extrusora 04"
            status="AVAILABLE"
            data={{
              Material: 'Polipropileno Transparente',
              Peso: '450.5 kg',
              Lote: 'L-2026-805',
              Operador: 'Juan Pérez'
            }}
          />
          <DataCard 
            title="Bobina Scrap" 
            variant="elevated"
            status="BLOCKED"
            data={{
              Motivo: 'Mancha de purga',
              Peso: '12.0 kg'
            }}
            headerRight={<StatusChip status="BLOCKED" />}
          />
        </div>
      </section>

      <section style={{ marginBottom: tokens.primitive.spacing['48'] }}>
        <h2>5. ScannerOverlay (Simulation Mode)</h2>
        <ActionButton onClick={() => setScannerOpen(true)}>
          Abrir Scanner QA
        </ActionButton>
      </section>

      {/* Universal Action Bar Demo */}
      <UniversalActionBar 
        secondaryActions={[
          <ActionButton key="cancel" variant="ghost">Atrás</ActionButton>
        ]}
        primaryActions={[
          <ActionButton key="save" variant="primary">Confirmar Recepción</ActionButton>
        ]}
      />

      {scannerOpen && (
        <ScannerOverlay 
          mode="SIMULATION" 
          onClose={() => setScannerOpen(false)} 
          onManualInput={() => { alert('Manual Input Clicked'); setScannerOpen(false); }}
        />
      )}
    </div>
  );
};
