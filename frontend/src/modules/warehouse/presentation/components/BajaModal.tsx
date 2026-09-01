import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, Loader2, Info } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { useAuthStore } from '../../../../store/authStore';

export const BajaModal = ({ item, resolutionRequestId, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  
  // Modos: RESOLUTION (Admin revisando), DIRECT (Admin borrando), REQUEST (Operador pidiendo)
  const isResolutionMode = !!resolutionRequestId;
  const canDirectDispose = hasPermission('warehouse.waste') || hasPermission('warehouse.dispose');
  const isRequestMode = !isResolutionMode && !canDirectDispose;

  const [selectedLotes, setSelectedLotes] = useState<number[]>([]);
  const [tipoBajaId, setTipoBajaId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Fetch Resolution Request details if in Resolution Mode
  const { data: requestDetails, isLoading: loadingRequest } = useQuery({
    queryKey: ['warehouse', 'dispose-request', resolutionRequestId],
    queryFn: async () => {
      if (!resolutionRequestId) return null;
      const response = await axiosClient.get(`/warehouse/inventory/dispose-request/${resolutionRequestId}`);
      return response.data.data;
    },
    enabled: isResolutionMode
  });

  // Material ID source depends on mode
  const currentMaterialId = isResolutionMode ? requestDetails?.material_id : item?.material_id;

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['warehouse', 'lotes', currentMaterialId],
    queryFn: async () => {
      if (!currentMaterialId) return [];
      const response = await axiosClient.get(`/warehouse/inventory/${currentMaterialId}/lotes`);
      return response.data.data;
    },
    enabled: !!currentMaterialId
  });

  const { data: tiposBaja = [], isLoading: loadingTipos } = useQuery({
    queryKey: ['warehouse', 'tipo-baja'],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/tipo-baja`);
      return response.data.data;
    }
  });

  // Pre-fill fields in Resolution Mode once data is loaded
  useEffect(() => {
    if (isResolutionMode && requestDetails && lotes.length > 0) {
      setTipoBajaId(String(requestDetails.tipo_baja_id));
      setNotes(requestDetails.notes || '');
      setSelectedLotes(requestDetails.lote_ids || []);
    }
  }, [isResolutionMode, requestDetails, lotes]);

  // Handle Create Request (WAREHOUSEMAN)
  const { mutate: handleCreateRequest, isLoading: isCreatingRequest } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/dispose-request', {
        material_id: currentMaterialId,
        lote_ids: selectedLotes,
        tipo_baja_id: Number(tipoBajaId),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Solicitud de baja enviada a autorización');
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al solicitar la baja');
    }
  });

  // Handle Direct Dispose (ADMIN)
  const { mutate: handleDirectDispose, isLoading: isDisposing } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/dispose', {
        material_id: currentMaterialId,
        lote_ids: selectedLotes,
        tipo_baja_id: Number(tipoBajaId),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Baja registrada exitosamente');
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar la baja');
    }
  });

  // Handle Resolve Request (ADMIN)
  const { mutate: handleResolveRequest, isLoading: isResolving } = useMutation({
    mutationFn: async (status: 'APPROVED' | 'REJECTED') => {
      await axiosClient.post(`/warehouse/inventory/dispose-resolve/${resolutionRequestId}`, {
        status
      });
    },
    onSuccess: (data, variables) => {
      toast.success(variables === 'APPROVED' ? 'Baja aprobada exitosamente' : 'Baja rechazada, lotes reactivados');
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al resolver la solicitud');
    }
  });

  const isSubmitting = isCreatingRequest || isDisposing || isResolving;

  const totalSelectedQuantity = useMemo(() => {
    return selectedLotes.reduce((acc, loteId) => {
      const lote = lotes.find(l => l.id === loteId);
      return acc + (lote ? Number((lote.available_amount ?? lote.amount) || 0) : 0);
    }, 0);
  }, [selectedLotes, lotes]);

  const toggleLote = (loteId: number) => {
    if (isResolutionMode) return; // Cannot change selection in resolution mode
    setSelectedLotes(prev => 
      prev.includes(loteId) ? prev.filter(id => id !== loteId) : [...prev, loteId]
    );
  };

  const activeLotes = useMemo(() => {
    return lotes.filter((lote: any) => {
      if (isResolutionMode) {
        // In resolution mode, we just want to show the selected ones and they might be frozen
        return requestDetails?.lote_ids?.includes(lote.id);
      }
      const isActive = lote.is_active === true || lote.is_active === 1 || String(lote.is_active) === '1';
      const available = Number((lote.available_amount ?? lote.amount) || 0);
      const notFrozen = lote.is_frozen === false || lote.is_frozen === 0 || String(lote.is_frozen) === '0';
      return isActive && available > 0 && notFrozen;
    });
  }, [lotes, isResolutionMode, requestDetails]);

  const toggleAll = () => {
    if (isResolutionMode) return;
    if (selectedLotes.length === activeLotes.length) {
      setSelectedLotes([]);
    } else {
      setSelectedLotes(activeLotes.map(l => l.id));
    }
  };

  const currentMaterial = isResolutionMode ? requestDetails?.material : item?.material;

  if (isResolutionMode && loadingRequest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
      <div className="bg-card w-full sm:max-w-lg max-h-[82dvh] sm:max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <AlertTriangle className="text-warning" size={20} />
            {isResolutionMode ? 'Autorización de Baja' : isRequestMode ? 'Solicitar Baja' : 'Baja de Material'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {isResolutionMode && requestDetails?.requester && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex gap-3">
              <Info className="text-primary shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-foreground">
                <span className="font-bold block text-primary">Solicitado por: {requestDetails.requester.first_name} {requestDetails.requester.last_name}</span>
                Este usuario ha solicitado dar de baja estos lotes. Por favor aprueba o rechaza la solicitud.
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Material</p>
                <p className="font-bold text-foreground">{currentMaterial?.name}</p>
                <p className="text-xs text-muted-foreground">{currentMaterial?.internal_code}</p>
              </div>
              {!isResolutionMode && (
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Disponible</p>
                  <p className="font-bold text-primary text-lg">{Number(item?.amount || 0).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lotes List */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-foreground">
                {isResolutionMode ? 'Lotes solicitados para baja' : 'Lotes disponibles'}
              </h4>
              {!isResolutionMode && (
                <button 
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {selectedLotes.length === activeLotes.length && activeLotes.length > 0 ? 'Desmarcar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-2">
              {loadingLotes ? (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Cargando lotes...</span>
                </div>
              ) : (() => {
                if (activeLotes.length === 0) {
                  return (
                    <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                      No hay lotes {isResolutionMode ? 'en esta solicitud' : 'activos para este material'}.
                    </div>
                  );
                }
                return activeLotes.map((lote: any) => (
                  <label 
                    key={lote.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isResolutionMode ? 'cursor-default opacity-80' : 'cursor-pointer'
                    } ${
                      selectedLotes.includes(lote.id) 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={selectedLotes.includes(lote.id)}
                      onChange={() => toggleLote(lote.id)}
                      disabled={isResolutionMode}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-foreground">Folio: {lote.folio || 'LEGACY-LOT'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{new Date(lote.date_received).toLocaleDateString()}</span>
                          {lote.user?.first_name && (
                            <>
                              <span>•</span>
                              <span>{lote.user.first_name}</span>
                            </>
                          )}
                          {lote.location && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-foreground">Loc: {lote.location.code}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">{Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}</Badge>
                    </div>
                  </label>
                ));
              })()}
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Tipo de baja *</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={tipoBajaId}
                onChange={e => setTipoBajaId(e.target.value)}
                disabled={isResolutionMode}
              >
                <option value="" disabled className="bg-background text-foreground">Seleccionar motivo</option>
                {tiposBaja.map(t => (
                  <option key={t.id} value={t.id} className="bg-background text-foreground">{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Notas (Opcional)</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detalles adicionales sobre la baja..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isResolutionMode}
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20">
            <span className="text-sm font-bold">Cantidad a dar de baja:</span>
            <span className="text-lg font-black">{totalSelectedQuantity.toFixed(2)}</span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex justify-end gap-3 shrink-0">
          
          {isResolutionMode ? (
            <>
              <Button variant="secondary" onClick={() => handleResolveRequest('REJECTED')} disabled={isSubmitting}>
                Rechazar (Reactivar Lotes)
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleResolveRequest('APPROVED')}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
                Aprobar Baja
              </Button>
            </>
          ) : isRequestMode ? (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={() => handleCreateRequest()}
                disabled={isSubmitting || selectedLotes.length === 0 || !tipoBajaId}
              >
                {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
                Solicitar autorización
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDirectDispose()}
                disabled={isSubmitting || selectedLotes.length === 0 || !tipoBajaId}
              >
                {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
                Confirmar baja
              </Button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
