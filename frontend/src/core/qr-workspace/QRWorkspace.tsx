import React from 'react';
import { QRScanResponse } from './types/qr-workspace.types';
import { EntityCard } from '@/shared/components/domain/EntityCard';
import { ActionButton } from '@/shared/components/domain/ActionButton';
import { WarningPanel } from './components/WarningPanel';
import { ProcessTimeline } from '@/shared/components/domain/ProcessTimeline';
import { GenealogyTree } from '@/shared/components/domain/GenealogyTree';

interface QRWorkspaceProps {
  data: QRScanResponse;
  onActionClick: (action: string) => void;
}

export function QRWorkspace({ data, onActionClick }: QRWorkspaceProps) {
  const primaryAction = data.allowed_actions.length > 0 ? data.allowed_actions[0] : null;
  const secondaryActions = data.allowed_actions.slice(1);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-32">
      
      {/* 1. Entity Summary & Primary Action */}
      <EntityCard
        entityType={data.entity.type}
        qrId={data.entity.code}
        status={data.status}
        quantity={data.quantity ? `${data.quantity.value} ${data.quantity.unit}` : 'N/A'}
        area={data.location?.area || 'Sin Área'}
        rack={data.location?.rack}
        accentColor="var(--color-primary)"
      >
        {primaryAction && (
          <ActionButton 
            action={primaryAction} 
            className="w-full h-14 text-lg shadow-md"
            onClick={() => onActionClick(primaryAction)}
          />
        )}
      </EntityCard>

      {/* 2. Warnings (Si existen) */}
      <WarningPanel warnings={data.warnings} />

      {/* 3. Secondary Actions (Acciones Permitidas) */}
      {secondaryActions.length > 0 && (
        <section className="solid-card p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-4 border-b border-border pb-2">Acciones Permitidas</h3>
          <div className="flex flex-wrap gap-4">
            {secondaryActions.map((action) => (
              <ActionButton 
                key={action} 
                action={action} 
                variant="outline"
                onClick={() => onActionClick(action)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Genealogy & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <section className="solid-card p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-6 border-b border-border pb-2">Trazabilidad (Genealogía)</h3>
          {data.traceability.parents.length > 0 || data.traceability.children.length > 0 ? (
            <div className="space-y-6">
              {data.traceability.parents.map(parent => (
                <GenealogyTree key={parent.id} data={parent} />
              ))}
              {/* Omitimos children por brevedad en la demo, se podría expandir */}
            </div>
          ) : (
            <p className="text-muted text-sm font-medium">Sin trazabilidad registrada.</p>
          )}
        </section>

        <section className="solid-card p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-6 border-b border-border pb-2">Historial de Movimientos</h3>
          {data.movements.length > 0 ? (
            <ProcessTimeline events={data.movements} />
          ) : (
            <p className="text-muted text-sm font-medium">Sin movimientos registrados.</p>
          )}
        </section>

      </div>

    </div>
  );
}
