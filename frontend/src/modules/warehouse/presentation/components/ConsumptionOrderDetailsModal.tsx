import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Hash, User, Clock, CheckCircle2, Search, QrCode, Download, ChevronUp, ChevronDown } from 'lucide-react';
import axiosClient from '../../../../api/axiosClient';
import { downloadConsumptionOrderPdf } from '../../utils/pdfUtils';
import { toast } from 'sonner';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

interface ConsumptionOrderDetailsModalProps {
  isOpen: boolean;
  orderUuid: string;
  onClose: () => void;
}

export const ConsumptionOrderDetailsModal: React.FC<ConsumptionOrderDetailsModalProps> = ({ isOpen, orderUuid, onClose }) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showActionsMobile, setShowActionsMobile] = useState(false);

  useEffect(() => {
    if (isOpen && orderUuid) {
      setShowScanner(false);
      setShowCancelConfirm(false);
      setCancelReason('');
      fetchOrderDetails();
    }
  }, [isOpen, orderUuid]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/warehouse/consumption-orders/${orderUuid}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      await axiosClient.put(`/warehouse/consumption-orders/${orderUuid}/status`, { status: newStatus });
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
      alert('Error actualizando el estado de la orden.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('El motivo de cancelación es obligatorio.');
      return;
    }
    try {
      setUpdating(true);
      await axiosClient.put(`/warehouse/consumption-orders/${orderUuid}/cancel`, { reason: cancelReason });
      toast.success('Orden cancelada exitosamente.');
      onClose(); // Cerrar modal y refrescar la tabla
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al cancelar la orden.');
    } finally {
      setUpdating(false);
    }
  };

  const handleScanItem = async (qrCode: string) => {
    try {
      setShowScanner(false); // Siempre cerrar el escaner al leer (éxito o error)
      setUpdating(true);
      await axiosClient.post(`/warehouse/consumption-orders/${orderUuid}/scan-item`, { qr_code: qrCode });
      toast.success(`Lote ${qrCode} surtido correctamente.`);
      await fetchOrderDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || `Error al procesar el lote ${qrCode}`);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  const statusColors: any = {
    'PENDIENTE': 'text-warning bg-warning/10 border-warning/20',
    'PREPARANDO': 'text-info bg-info/10 border-info/20',
    'SURTIDA': 'text-success bg-success/10 border-success/20',
    'CANCELADA': 'text-destructive bg-destructive/10 border-destructive/20',
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner shrink-0 mt-0.5 sm:mt-0">
              <Package size={20} className="sm:hidden" />
              <Package size={24} className="hidden sm:block" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mb-1 sm:mb-0">
                <h2 className="text-lg sm:text-xl font-bold text-foreground break-all sm:break-normal">
                  {order?.order_number || 'Cargando...'}
                </h2>
                {order && (
                  <span className={`w-fit text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border ${statusColors[order.status] || ''}`}>
                    {order.status}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-0.5">
                <Clock size={12} className="sm:hidden shrink-0" />
                <Clock size={14} className="hidden sm:block shrink-0" /> 
                <span className="truncate">Solicitado: {order ? new Date(order.created_at).toLocaleString() : ''}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground shrink-0 mt-0.5 sm:mt-0 bg-background/50 sm:bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {loading ? (
            <div className="flex justify-center py-20 text-muted-foreground">Cargando detalles...</div>
          ) : !order ? (
            <div className="flex justify-center py-20 text-destructive">Error al cargar la orden</div>
          ) : (
            <div className="space-y-6">
              
              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Solicitante</span>
                  <div className="font-medium flex items-center gap-2 text-foreground">
                    <User size={16} className="text-primary" />
                    {order.requester?.name || order.requester?.first_name} {order.requester?.last_name}
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Área</span>
                  <div className="font-medium text-foreground">{order.requesting_area?.name || 'N/A'}</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Código QR</span>
                  <div className="font-medium flex items-center gap-2 text-primary">
                    <QrCode size={16} />
                    Asignado ({order.qr_code_id})
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Resolución</span>
                  <div className="font-medium text-foreground">
                    {order.status === 'CANCELADA' ? (
                      <span className="text-destructive flex items-center gap-1"><X size={16} /> Cancelada el {new Date(order.resolved_at || order.updated_at).toLocaleDateString()}</span>
                    ) : order.resolved_at ? (
                      <span className="text-success flex items-center gap-1"><CheckCircle2 size={16} /> Surtida el {new Date(order.resolved_at).toLocaleDateString()}</span>
                    ) : 'Pendiente'}
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="bg-info/5 border border-info/20 p-4 rounded-xl">
                  <strong className="text-sm text-info block mb-1">Notas / Instrucciones:</strong>
                  <p className="text-sm text-foreground m-0">{order.notes}</p>
                </div>
              )}

              {/* Items List */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Materiales Solicitados (Lotes Asignados FIFO)</h3>
                
                <div className="border border-border rounded-xl overflow-x-auto bg-card">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground w-10">Status</th>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Material</th>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Lote Esperado</th>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground text-right">Cantidad Surtida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.items?.map((item: any, idx: number) => {
                        const isFulfilled = Number(item.fulfilled_quantity) >= Number(item.requested_quantity);
                        return (
                          <tr key={idx} className={`hover:bg-muted/10 ${isFulfilled ? 'bg-success/5' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              {isFulfilled ? (
                                <CheckCircle2 className="text-success inline-block" size={20} />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 inline-block" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className={`font-medium ${isFulfilled ? 'text-foreground' : 'text-foreground'}`}>{item.material?.name}</div>
                              <div className="text-xs text-muted-foreground">{item.material?.material_code}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`font-mono text-sm px-2 py-1 rounded inline-block border ${isFulfilled ? 'bg-success/20 border-success/30 text-success-foreground' : 'bg-muted/40 border-border text-foreground'}`}>
                                {item.lote?.folio || 'N/A'}
                                {item.lote?.qr_code?.qr_code && <span className="ml-2 opacity-70 text-xs">(QR: {item.lote.qr_code.qr_code})</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold">
                                <span className={isFulfilled ? 'text-success' : 'text-primary'}>
                                  {parseFloat(item.fulfilled_quantity || 0).toFixed(2)}
                                </span>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span className="text-foreground">{parseFloat(item.requested_quantity).toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{item.unit?.abbreviation || 'Unidades'}</div>
                            </td>
                          </tr>
                        );
                      })}
                      {(!order.items || order.items.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Sin materiales</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scanner is now rendered globally if showScanner is true */}
              {showScanner && (
                <CameraScanner 
                  inline={false} 
                  title={`Surtir Orden ${order.order_number}`}
                  onScan={(code) => handleScanItem(code)} 
                  onClose={() => setShowScanner(false)} 
                />
              )}

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl">
          
          {/* Mobile Toggle Button */}
          <button 
            onClick={() => setShowActionsMobile(!showActionsMobile)}
            className="sm:hidden w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-muted-foreground bg-background border border-border rounded-xl"
          >
            {showActionsMobile ? (
              <>Ocultar Acciones <ChevronDown size={16} /></>
            ) : (
              <>Ver Acciones <ChevronUp size={16} /></>
            )}
          </button>

          {/* Action Buttons Container */}
          <div className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-3 w-full sm:w-auto overflow-hidden transition-all duration-300 ${showActionsMobile ? 'max-h-[500px] opacity-100 mt-2 sm:mt-0' : 'max-h-0 opacity-0 sm:max-h-full sm:opacity-100'}`}>
            
            {order && (
              <button 
                onClick={async () => {
                  try {
                    toast.info('Generando PDF...');
                    await downloadConsumptionOrderPdf(order);
                    toast.success('PDF descargado exitosamente.');
                  } catch (err) {
                    console.error(err);
                    toast.error('Ocurrió un error al generar el PDF.');
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-secondary text-secondary-foreground border border-border rounded-xl font-medium hover:bg-secondary/80 transition-colors shadow-sm flex items-center justify-center gap-2 sm:mr-auto"
              >
                <Download size={18} /> Descargar PDF
              </button>
            )}

            {(order?.status === 'PENDIENTE' || order?.status === 'PREPARANDO') && (
              <button 
                onClick={() => setShowCancelConfirm(true)}
                disabled={updating}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-medium hover:bg-red-500 hover:text-white transition-colors shadow-sm flex items-center justify-center"
              >
                Cancelar Orden
              </button>
            )}

            {order?.status === 'PENDIENTE' && (
              <button 
                onClick={() => updateStatus('PREPARANDO')}
                disabled={updating}
                className="w-full sm:w-auto px-5 py-2.5 bg-info text-info-foreground rounded-xl font-medium hover:bg-info/90 transition-colors shadow-sm flex items-center justify-center"
              >
                Iniciar Preparación
              </button>
            )}

            {order?.status === 'PREPARANDO' && (
              <button 
                onClick={() => setShowScanner(true)}
                disabled={updating}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <QrCode size={18} /> Escanear Lotes
              </button>
            )}
            
          </div>
        </div>

        {/* Cancel Confirmation Modal / Overlay */}
        {showCancelConfirm && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 flex flex-col gap-4">
              <h3 className="text-xl font-bold text-red-500">Confirmar Cancelación</h3>
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas cancelar esta orden? El inventario asignado será devuelto a los lotes originales.
              </p>
              <textarea
                className="w-full bg-background border border-input text-foreground rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none placeholder:text-muted-foreground"
                rows={3}
                placeholder="Motivo de cancelación (Obligatorio)..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={updating}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Regresar
                </button>
                <button 
                  onClick={handleCancelOrder}
                  disabled={updating || !cancelReason.trim()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Cancelando...' : 'Confirmar y Cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
