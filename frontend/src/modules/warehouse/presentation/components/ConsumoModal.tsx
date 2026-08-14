import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, QrCode, Trash2, Package } from 'lucide-react';
import { Button, Input, Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';

export const ConsumoModal = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ id: string; qrCode: string; lote_id: number; material_id: number; maxQuantity: number; quantity: number; materialName: string }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const { mutate: handleConsume, isLoading: isSubmitting } = useMutation({
    mutationFn: async () => {
      const payloadItems = items.map(i => ({
        material_id: i.material_id,
        lote_id: i.lote_id,
        qr_id: i.id, // Assuming id from scan is qr_id, or we need to resolve it
        quantity: i.quantity
      }));
      await axiosClient.post('/warehouse/inventory/consume', {
        order_number: orderNumber,
        notes,
        items: payloadItems
      });
    },
    onSuccess: () => {
      toast.success('Consumo registrado exitosamente');
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar el consumo');
    }
  });

  const handleScan = async (code: string) => {
    if (!code) return;
    try {
      // Endpoint to resolve QR to Lote details (we might need a specific one, or just use /traceability/qr/:code)
      const response = await axiosClient.get(`/qrcodes/${encodeURIComponent(code)}`);
      const qrData = response.data.data;
      
      // Assuming QR has metadata pointing to lote or it's a Lote QR
      // For now, let's assume we fetch lote details if it's assigned to a Lote
      if (qrData.metadata?.lote_id) {
         const loteRes = await axiosClient.get(`/warehouse/lotes/${qrData.metadata.lote_id}`);
         const loteData = loteRes.data.data.lote;
         
         if (items.some(i => i.lote_id === loteData.id)) {
           toast.error('Este lote ya está en la lista.');
           return;
         }

         setItems(prev => [...prev, {
           id: qrData.id,
           qrCode: code,
           lote_id: loteData.id,
           material_id: loteData.material_id,
           materialName: loteData.material?.name || 'Material',
           maxQuantity: Number(loteData.available_amount),
           quantity: Number(loteData.available_amount) // Default to max
         }]);
         setScanInput('');
      } else {
         toast.error('El QR escaneado no está asociado a un lote válido.');
      }
    } catch (e) {
      toast.error('Error al resolver QR. Verifique que exista y esté activo.');
    }
  };

  const updateItemQuantity = (index: number, val: number) => {
    const newItems = [...items];
    if (val > newItems[index].maxQuantity) val = newItems[index].maxQuantity;
    if (val < 0) val = 0;
    newItems[index].quantity = val;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-primary/10 shrink-0">
          <h3 className="font-bold text-lg text-primary flex items-center gap-2">
            <Package size={20} />
            Consumo de Material
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">Número de Orden/Solicitud <span className="text-destructive">*</span></label>
              <Input 
                placeholder="Ej. ORD-2023-001" 
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">Notas (Opcional)</label>
              <Input 
                placeholder="Motivo del consumo o detalles..." 
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-foreground">Materiales a Consumir</h4>
              <div className="flex gap-2">
                <Input 
                  placeholder="Escanear QR..." 
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleScan(scanInput); }}
                  className="w-48"
                  prefix={<QrCode size={16} className="text-muted-foreground ml-2" />}
                />
                <Button variant="secondary" onClick={() => handleScan(scanInput)}>
                  <Plus size={16} className="mr-2" /> Agregar
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <QrCode size={40} className="text-muted-foreground mb-3 opacity-50" />
                <p className="font-bold text-foreground mb-1">No hay materiales agregados</p>
                <p className="text-sm text-muted-foreground">Escanee o ingrese un código QR para comenzar el consumo.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="px-4 py-3 text-left font-black uppercase text-muted-foreground">Material / QR</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-muted-foreground">Lote ID</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-muted-foreground">Disponible</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-muted-foreground w-32">A Consumir</th>
                      <th className="px-4 py-3 text-right font-black uppercase text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border/50">
                        <td className="px-4 py-3">
                          <p className="font-bold">{item.materialName}</p>
                          <p className="text-xs text-muted-foreground">{item.qrCode}</p>
                        </td>
                        <td className="px-4 py-3">LOTE-{item.lote_id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.maxQuantity}</td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number" 
                            min="0.1" 
                            max={item.maxQuantity}
                            step="0.1"
                            value={item.quantity}
                            onChange={e => updateItemQuantity(idx, Number(e.target.value))}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex justify-between items-center shrink-0">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Items</span>
              <span className="font-bold text-foreground text-lg leading-none">{items.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Cant. Total</span>
              <span className="font-bold text-primary text-lg leading-none">{totalQuantity.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleConsume()} 
              disabled={isSubmitting || items.length === 0 || !orderNumber}
            >
              {isSubmitting && <Plus className="animate-spin mr-2" size={16} />}
              Confirmar Consumo
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
