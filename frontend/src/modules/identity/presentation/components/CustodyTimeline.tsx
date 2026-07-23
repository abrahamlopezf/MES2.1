import React from 'react';
import { useCustodyTimelineQuery } from '../hooks/useCustodyPipeline';
import { TransferReason } from '../../domain/valueObjects/CustodyValueObjects';
import { ArrowRight, CheckCircle2, AlertTriangle, Package, History, Wrench, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CustodyTimelineProps {
  identityTokenId: string;
}

const getReasonIcon = (reason: TransferReason) => {
  switch (reason) {
    case TransferReason.PRODUCTION_START:
      return <CheckCircle2 className="text-blue-500" size={20} />;
    case TransferReason.QUALITY_CHECK:
      return <AlertTriangle className="text-amber-500" size={20} />;
    case TransferReason.STORAGE:
      return <Package className="text-emerald-500" size={20} />;
    case TransferReason.REWORK:
      return <Wrench className="text-purple-500" size={20} />;
    case TransferReason.SCRAP:
      return <Trash2 className="text-red-500" size={20} />;
    default:
      return <History className="text-slate-400" size={20} />;
  }
};

const getReasonLabel = (reason: TransferReason) => {
  switch (reason) {
    case TransferReason.PRODUCTION_START: return 'Inicio de Producción';
    case TransferReason.QUALITY_CHECK: return 'Inspección de Calidad';
    case TransferReason.STORAGE: return 'Almacenamiento';
    case TransferReason.REWORK: return 'Retrabajo';
    case TransferReason.SCRAP: return 'Scrap / Merma';
    default: return reason;
  }
};

export const CustodyTimeline: React.FC<CustodyTimelineProps> = ({ identityTokenId }) => {
  const { data: timeline, isLoading, isError } = useCustodyTimelineQuery(identityTokenId);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError || !timeline) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded">
        No se pudo cargar el historial de trazabilidad.
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-2 mb-6">
        <History className="text-slate-700" size={24} />
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Timeline de Custodia</h3>
      </div>
      
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {timeline.movements.map((movement, index) => (
          <div key={movement.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Icon Marker */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              {getReasonIcon(movement.reason)}
            </div>

            {/* Card Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {getReasonLabel(movement.reason)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(movement.performedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                  {movement.fromOwner}
                </span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold">
                  {movement.toOwner}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
                <span>Op: <span className="font-medium text-slate-700">{movement.operatorId}</span></span>
                <span>{new Date(movement.performedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
