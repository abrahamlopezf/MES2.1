import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/shared/components/domain/StatusBadge';
import { ActionButton } from '@/shared/components/domain/ActionButton';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { EntityCard } from '@/shared/components/domain/EntityCard';
import { ProcessTimeline } from '@/shared/components/domain/ProcessTimeline';
import { GenealogyTree } from '@/shared/components/domain/GenealogyTree';
import { QRWorkspace } from '@/core/qr-workspace/QRWorkspace';
import { QRScanResponse } from '@/core/qr-workspace/types/qr-workspace.types';
import { LayoutDashboard } from 'lucide-react';

const MOCK_WORKSPACE_DATA: QRScanResponse = {
  entity: { id: 'e1', code: 'MI-EXT-4421', type: 'Producto Intermedio', name: 'Rollo Film Stretch' },
  status: 'PENDIENTE',
  quantity: { value: 1200, unit: 'mts' },
  location: { area: 'Extrusión', rack: 'Buffer-A' },
  allowed_actions: [
    { code: 'CONSUME', label: 'Consumir', description: 'Consumir en corrida actual', icon: 'Play', severity: 'default', requires_confirmation: false },
    { code: 'TRANSFER', label: 'Transferir', description: 'Mover a otra área', icon: 'ArrowRight', severity: 'warning', requires_confirmation: true },
    { code: 'REGISTER_SCRAP', label: 'Reportar Scrap', description: 'Declarar merma operativa', icon: 'Trash2', severity: 'danger', requires_confirmation: true },
    { code: 'PRINT_LABEL', label: 'Imprimir', description: 'Generar etiqueta térmica', icon: 'Printer', severity: 'outline', requires_confirmation: false }
  ],
  warnings: [
    { id: 'w1', code: 'WRN-QA', message: 'Muestra de calidad pendiente de validación.', severity: 'medium' }
  ],
  traceability: {
    parents: [
      { id: 'p1', type: 'Mix Preparado', qrId: 'MIX-991', status: 'CONSUMIDO', quantity: '100 kg' }
    ],
    children: []
  },
  movements: [
    { id: 'm1', title: 'Generación MI', timestamp: '10:30 AM', actor: 'Línea 2', isCompleted: true, description: 'Cierre de corrida.' },
    { id: 'm2', title: 'Transferencia a Buffer', timestamp: '10:45 AM', actor: 'Juan P.', isCompleted: true },
    { id: 'm3', title: 'Aprobación Calidad', timestamp: '', isCompleted: false, isCurrent: true }
  ]
};

export default function PlaygroundScreen() {
  const [activeTab, setActiveTab] = useState<'components' | 'workspace'>('workspace');
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-24">
      
      <SectionHeader 
        title="Laboratorio Industrial (Playground)" 
        description="Visualización de Componentes de Dominio ERP (Fase 3 y 5)."
        icon={LayoutDashboard}
        action={<Button variant="outline">Documentación</Button>}
      />

      <div className="flex gap-4 border-b border-border pb-4">
        <Button variant={activeTab === 'components' ? 'default' : 'ghost'} onClick={() => setActiveTab('components')}>
          Kit de Dominio (Fase 3)
        </Button>
        <Button variant={activeTab === 'workspace' ? 'default' : 'ghost'} onClick={() => setActiveTab('workspace')}>
          QR Workspace (Fase 5)
        </Button>
      </div>

      {activeTab === 'workspace' ? (
        <QRWorkspace 
          data={MOCK_WORKSPACE_DATA} 
          onActionClick={(action) => alert(`El backend ejecutaría la acción: ${action}`)}
        />
      ) : (
        <div className="space-y-12">

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-muted uppercase tracking-widest border-b border-border pb-2">1. Estados Universales (StatusBadge)</h2>
        <div className="flex flex-wrap gap-4 bg-surface p-6 border border-border rounded-lg">
          <StatusBadge status="RECIBIDO" />
          <StatusBadge status="EN_PROCESO" />
          <StatusBadge status="DISPONIBLE" />
          <StatusBadge status="TRANSFERIDO" />
          <StatusBadge status="CONSUMIDO" />
          <StatusBadge status="PENDIENTE" />
          <StatusBadge status="BLOQUEADO" />
          <StatusBadge status="SCRAP" />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-muted uppercase tracking-widest border-b border-border pb-2">2. Acciones HATEOAS (ActionButton)</h2>
        <p className="text-sm text-text">Estos botones se renderizan automáticamente basados en el array `allowed_actions` del backend.</p>
        <div className="flex flex-wrap gap-4 bg-surface p-6 border border-border rounded-lg">
          <ActionButton action={{ code: 'RECEIVE', label: 'Recibir', description: 'Ingreso al almacén', icon: 'Archive', severity: 'success', requires_confirmation: false }} />
          <ActionButton action={{ code: 'CONSUME', label: 'Consumir', description: 'Usar en máquina', icon: 'Play', severity: 'default', requires_confirmation: false }} />
          <ActionButton action={{ code: 'TRANSFER', label: 'Transferir', description: 'Mover material', icon: 'ArrowRight', severity: 'warning', requires_confirmation: true }} />
          <ActionButton action={{ code: 'REGISTER_SCRAP', label: 'Reportar Scrap', description: 'Desechar material', icon: 'Trash2', severity: 'danger', requires_confirmation: true }} />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-muted uppercase tracking-widest border-b border-border pb-2">3. Tarjetas de Entidad (EntityCard)</h2>
        <div className="grid grid-cols-1 gap-6">
          <EntityCard 
            entityType="Materia Prima" 
            qrId="MP-2026-8991" 
            status="RECIBIDO" 
            quantity="520.50 kg" 
            area="Almacén Central" 
            rack="R-05"
            accentColor="#2563EB"
          >
            <ActionButton action={{ code: 'TRANSFER', label: 'Transferir', description: 'Mover material', icon: 'ArrowRight', severity: 'warning', requires_confirmation: true }} className="w-full h-12 text-lg" />
            <ActionButton action={{ code: 'PRINT_LABEL', label: 'Imprimir', description: 'Generar etiqueta', icon: 'Printer', severity: 'outline', requires_confirmation: false }} className="w-full" />
          </EntityCard>

          <EntityCard 
            entityType="Producto Intermedio" 
            qrId="MI-EXT-4421" 
            status="EN_PROCESO" 
            quantity="1,200 mts" 
            area="Extrusión" 
            accentColor="#F59E0B"
          >
            <ActionButton action={{ code: 'CONSUME', label: 'Consumir', description: 'Usar en corrida', icon: 'Play', severity: 'default', requires_confirmation: false }} className="w-full h-12 text-lg" />
            <ActionButton action={{ code: 'REGISTER_SCRAP', label: 'Reportar Scrap', description: 'Descartar', icon: 'Trash2', severity: 'danger', requires_confirmation: true }} className="w-full" />
          </EntityCard>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-muted uppercase tracking-widest border-b border-border pb-2">4. Línea de Tiempo (Timeline)</h2>
          <div className="bg-surface p-6 border border-border rounded-lg">
            <ProcessTimeline events={[
              { id: '1', title: 'Recepción MP', timestamp: '08:00 AM', actor: 'Juan Pérez', isCompleted: true, description: 'Pesaje validado en báscula 1.' },
              { id: '2', title: 'Transferencia a Mezclado', timestamp: '09:15 AM', actor: 'María López', isCompleted: true },
              { id: '3', title: 'Proceso de Mezclado', timestamp: '10:30 AM', actor: 'Sistema', isCompleted: false, isCurrent: true, description: 'Corrida C-992 en progreso...' },
              { id: '4', title: 'Liberación de Calidad', timestamp: '', isCompleted: false }
            ]} />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-muted uppercase tracking-widest border-b border-border pb-2">5. Genealogía (GenealogyTree)</h2>
          <div className="bg-surface p-6 border border-border rounded-lg overflow-x-auto">
            <GenealogyTree data={{
              id: 'g1', type: 'Mix Preparado', qrId: 'MIX-991', status: 'CONSUMIDO', quantity: '100 kg',
              children: [
                { id: 'g2', type: 'Materia Prima', qrId: 'MP-801', status: 'CONSUMIDO', quantity: '60 kg' },
                { id: 'g3', type: 'Materia Prima', qrId: 'MP-802', status: 'CONSUMIDO', quantity: '40 kg', 
                  children: [
                    { id: 'g4', type: 'Lote Proveedor', qrId: 'PROV-11', status: 'FINALIZADO', quantity: '1000 kg' }
                  ]
                }
              ]
            }} />
          </div>
        </div>
      </section>
      </div>
      )}
    </div>
  );
}
