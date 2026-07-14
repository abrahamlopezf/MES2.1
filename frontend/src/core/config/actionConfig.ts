import { 
  ArrowRight, 
  Play, 
  Trash2, 
  Archive, 
  CheckSquare, 
  Ban, 
  Printer,
  Undo
} from 'lucide-react';

export const ACTION_MAP = {
  'RECEIVE': { label: 'Recibir Material', variant: 'success', icon: Archive, description: 'Ingresar material al inventario.' },
  'TRANSFER': { label: 'Transferir', variant: 'warning', icon: ArrowRight, description: 'Mover material a otra área.' },
  'CONSUME': { label: 'Consumir', variant: 'default', icon: Play, description: 'Usar material en producción.' },
  'REGISTER_SCRAP': { label: 'Reportar Scrap', variant: 'destructive', icon: Trash2, description: 'Declarar desperdicio.' },
  'APPROVE_QA': { label: 'Aprobar (Calidad)', variant: 'success', icon: CheckSquare, description: 'Liberar material retenido.' },
  'REJECT_QA': { label: 'Rechazar (Calidad)', variant: 'destructive', icon: Ban, description: 'Bloquear material.' },
  'PRINT_LABEL': { label: 'Imprimir Etiqueta', variant: 'secondary', icon: Printer, description: 'Generar sticker QR térmico.' },
  'ROLLBACK': { label: 'Revertir Acción', variant: 'outline', icon: Undo, description: 'Deshacer último movimiento.' },
} as const;

export type ErpAction = keyof typeof ACTION_MAP;
