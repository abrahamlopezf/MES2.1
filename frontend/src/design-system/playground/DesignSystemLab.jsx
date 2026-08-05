import React, { useState } from 'react';
import { tokens } from '../foundation/tokens';
import { PrimitiveButton } from '../components/button/PrimitiveButton';
import { ActionButton } from '../components/button/ActionButton';
import { StatusChip } from '../components/chip/StatusChip';
import { UniversalActionBar } from '../components/action-bar/UniversalActionBar';
import { ScannerOverlay } from '../components/scanner-overlay/ScannerOverlay';
import { Input } from '../components/input/Input';
import { DataCard } from '../components/card/DataCard';

/**
 * Design System Lab
 * Reemplaza al Playground clásico. Inspecciona componentes desde 7 perspectivas.
 */
export const DesignSystemLab = () => {
  const [activeTab, setActiveTab] = useState('GALLERY');

  const tabs = [
    'GALLERY', 'ACCESSIBILITY', 'STRESS', 'PERFORMANCE', 'HARDWARE', 'CONTRACTS', 'TOKENS'
  ];

  const renderTab = () => {
    switch(activeTab) {
      case 'GALLERY':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <section>
              <h2>Botones</h2>
              <div style={{ display: 'flex', gap: '16px' }}>
                <ActionButton variant="primary" data-mes-action="SAVE">Guardar (Action)</ActionButton>
                <PrimitiveButton variant="secondary">Cancelar (Primitive)</PrimitiveButton>
              </div>
            </section>
            <section>
              <h2>Status Chips</h2>
              <div style={{ display: 'flex', gap: '16px' }}>
                <StatusChip status="AVAILABLE" />
                <StatusChip status="BLOCKED" />
              </div>
            </section>
          </div>
        );
      case 'ACCESSIBILITY':
        return (
          <div>
            <h2>Accessibility Audit (Simulado)</h2>
            <p>Todos los componentes pasan contraste AA y áreas táctiles de 56px.</p>
            <Input label="Label en alto contraste" error="Validación de color y texto" />
          </div>
        );
      case 'STRESS':
        return (
          <div>
            <h2>Stress Test (100 Chips)</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Array.from({ length: 100 }).map((_, i) => (
                <StatusChip key={i} status={i % 2 === 0 ? 'AVAILABLE' : 'RESERVED'} />
              ))}
            </div>
          </div>
        );
      case 'HARDWARE':
        return (
          <div>
            <h2>Hardware Simulation</h2>
            <ScannerOverlay mode="SIMULATION" />
          </div>
        );
      case 'CONTRACTS':
        return (
          <div>
            <h2>Validación de Contratos</h2>
            <pre style={{ background: '#222', padding: '16px', borderRadius: '8px' }}>
              {JSON.stringify(ActionButton.metadata, null, 2)}
            </pre>
            <pre style={{ background: '#222', padding: '16px', borderRadius: '8px' }}>
              {JSON.stringify(StatusChip.metadata, null, 2)}
            </pre>
          </div>
        );
      default:
        return <div>Tab en construcción...</div>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: tokens.semantic.color.background, color: tokens.semantic.color.textHighEmphasis }}>
      
      {/* Lab Header */}
      <div style={{ padding: '24px', borderBottom: `1px solid ${tokens.semantic.color.borderDefault}`, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <PrimitiveButton 
            key={tab} 
            variant={activeTab === tab ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </PrimitiveButton>
        ))}
      </div>

      {/* Lab Content */}
      <div style={{ padding: '48px' }}>
        {renderTab()}
      </div>

    </div>
  );
};
