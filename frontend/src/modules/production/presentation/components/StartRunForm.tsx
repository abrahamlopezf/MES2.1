import React, { useState } from 'react';
import { useStartProductionRunMutation } from '../hooks/useProductionPipeline';
import { Icon } from '@/design-system';

interface StartRunFormProps {
  onSuccess?: (runId: string) => void;
}

export const StartRunForm: React.FC<StartRunFormProps> = ({ onSuccess }) => {
  const mutation = useStartProductionRunMutation();

  const [orderId, setOrderId] = useState('');
  const [stationId, setStationId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !stationId || !operatorId || !materialId || quantity <= 0) return;

    mutation.mutate(
      {
        productionOrderId: orderId,
        stationId: stationId,
        operatorId: operatorId,
        reservedInputs: [
          {
            materialId,
            expectedQuantity: { amount: quantity, unit: 'kg' }
          }
        ]
      },
      {
        onSuccess: (data) => {
          if (onSuccess) onSuccess(data.productionRunId);
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 text-foreground shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
        <div className="flex items-center justify-center rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
          <Icon name="play_arrow" size={24} fill />
        </div>
        <h2 className="text-xl font-bold text-foreground">Iniciar Nueva Corrida</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
            <Icon name="precision_manufacturing" size={16} /> Identificación
          </h3>
          
          <div>
            <label className="mb-1 block text-base font-medium text-foreground">Orden de Producción</label>
            <input 
              type="text" 
              required
              value={orderId}
              placeholder="Folio de la orden"
              onChange={(e) => setOrderId(e.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-mono uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-base font-medium text-foreground">Estación / Máquina</label>
            <input 
              type="text" 
              required
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              placeholder="Código de estación o máquina"
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-mono uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-base font-medium text-foreground">ID de operador</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="person" size={16} className="text-muted-foreground" />
              </div>
              <input 
                type="text" 
                required
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="Identificador del operador"
                className="min-h-11 w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-base font-mono uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
            <Icon name="inventory_2" size={16} /> Reserva de Materiales
          </h3>
          
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-3">
              <label className="mb-1 block text-base font-medium text-foreground">Material requerido (lote o ID)</label>
              <input 
                type="text" 
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                placeholder="Código o lote del material"
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base font-mono uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-base font-medium text-foreground">Cantidad estimada</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={quantity || ''}
                  onChange={(e) => setQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="w-16">
                <label className="mb-1 block text-base font-medium text-foreground">Unidad</label>
                <input 
                  type="text" 
                  disabled
                  value="kg"
                  className="min-h-11 w-full rounded-md border border-border bg-muted px-2 py-2 text-base text-muted-foreground text-center"
                />
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300">
              <Icon name="info" size={14} /> Reserva lógica. No descuenta inventario.
            </p>
          </div>
        </div>
      </div>

      {mutation.isError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4 text-foreground">
          <Icon name="warning" className="mt-0.5 shrink-0 text-danger" size={18} />
          <div>
            <p className="font-bold text-sm">Fallo al iniciar corrida</p>
            <p className="text-sm mt-1">{mutation.error.message}</p>
          </div>
        </div>
      )}

      {mutation.isSuccess && (
        <div role="status" className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-success/40 bg-success/10 p-4 text-foreground">
          <div>
            <p className="font-bold text-sm">Corrida Iniciada Exitosamente</p>
            <p className="text-sm mt-1 opacity-90">ID: {mutation.data.productionRunId}</p>
          </div>
          <div className="rounded bg-success/20 px-3 py-1 text-sm font-bold text-success">
            {mutation.data.status}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || mutation.isSuccess}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <>
            <Icon name="progress_activity" className="animate-spin" size={24} /> Iniciando Hardware...
          </>
        ) : (
          <>
            <Icon name="play_arrow" size={24} fill /> INICIAR PRODUCCIÓN
          </>
        )}
      </button>
    </form>
  );
};
