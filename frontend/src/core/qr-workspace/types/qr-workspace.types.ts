import { ErpStatus } from '@/core/config/statusConfig';
import { ErpAction } from '@/core/config/actionConfig';
import { TimelineEvent } from '@/shared/components/domain/ProcessTimeline';
import { GenealogyNode } from '@/shared/components/domain/GenealogyTree';

export type EntityType = 'Materia Prima' | 'Producto Intermedio' | 'Mix Preparado' | 'Producto Terminado' | 'Scrap' | 'Merma';

export interface TraceNode extends GenealogyNode {}
export interface MovementEvent extends TimelineEvent {}

export interface Warning {
  id: string;
  code: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AllowedAction {
  code: string;
  label: string;
  description: string;
  icon: string;
  severity: 'primary' | 'warning' | 'danger' | 'default' | 'secondary' | 'outline';
  requires_confirmation: boolean;
}

export interface QRScanResponse {
  entity: {
    id: string;
    code: string; // El QR escaneado (ej. MP-8891)
    type: EntityType;
    name: string;
    description?: string;
  };
  
  status: ErpStatus;
  
  quantity?: {
    value: number;
    unit: string;
  };
  
  location?: {
    rack: string;
    area: string;
  };
  
  traceability: {
    parents: TraceNode[];
    children: TraceNode[];
  };
  
  movements: MovementEvent[];
  
  allowed_actions: AllowedAction[];
  
  warnings: Warning[];
}
