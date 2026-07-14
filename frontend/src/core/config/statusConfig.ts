import { 
  CheckCircle2, 
  Activity, 
  ArrowRightLeft, 
  Archive, 
  Trash2, 
  AlertTriangle, 
  PackageCheck,
  Ban,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const STATUS_MAP = {
  'RECIBIDO': { label: 'Recibido', variant: 'success', icon: CheckCircle2, description: 'Material ingresado y validado.' },
  'EN_PROCESO': { label: 'En Proceso', variant: 'primary', icon: Activity, description: 'Actualmente en línea de producción.' },
  'TRANSFERIDO': { label: 'Transferido', variant: 'info', icon: ArrowRightLeft, description: 'Enviado a otra área o proceso.' },
  'DISPONIBLE': { label: 'Disponible', variant: 'success', icon: PackageCheck, description: 'Listo para ser consumido.' },
  'CONSUMIDO': { label: 'Consumido', variant: 'secondary', icon: Archive, description: 'Agotado en corrida de producción.' },
  'SCRAP': { label: 'Scrap', variant: 'danger', icon: Trash2, description: 'Material descartado por defecto.' },
  'MERMA': { label: 'Merma', variant: 'danger', icon: AlertTriangle, description: 'Pérdida operativa registrada.' },
  'FINALIZADO': { label: 'Finalizado', variant: 'success', icon: CheckCircle2, description: 'Ciclo de vida cerrado.' },
  'PENDIENTE': { label: 'Pendiente', variant: 'warning', icon: Clock, description: 'Esperando acción del operador.' },
  'ESPERANDO': { label: 'Esperando', variant: 'warning', icon: Clock, description: 'En espera de autorización o proceso.' },
  'BLOQUEADO': { label: 'Bloqueado', variant: 'danger', icon: Ban, description: 'Retenido por anomalías.' },
  'CALIDAD': { label: 'Calidad', variant: 'quality', icon: ShieldCheck, description: 'Bajo inspección de calidad.' },
} as const;

export type ErpStatus = keyof typeof STATUS_MAP;
