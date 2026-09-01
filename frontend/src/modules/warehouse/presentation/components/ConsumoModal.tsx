import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, QrCode, Trash2, Package } from 'lucide-react';
import { Button, Input, Badge } from '../../../../design-system';
import { SearchSelect } from '../../../../design-system/components/Input/SearchSelect';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

export const ConsumoModal = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ id?: string; qrCode?: string; lote_id?: number; material_id: number; maxQuantity: number; quantity: number; materialName: string }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Fetch materials
  const { data: materialsData } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const response = await axiosClient.get(`/materials?pageSize=10000`);
      return response.data;
    }
  });

  const materialsList = materialsData?.data?.items || (Array.isArray(materialsData?.data) ? materialsData.data : []);
  const materials = [...materialsList].sort((a: any, b: any) => {
    const textA = `${a.internal_code} - ${a.name}`.toLowerCase();
    const textB = `${b.internal_code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

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
      // Endpoint to resolve QR to Inventory details
      const response = await axiosClient.get(`/qr/lookup/${encodeURIComponent(code)}`);
      const data = response.data.data || response.data;
      const inventory = data.inventory;
      const qr = data.qr;
      
      if (inventory && inventory.lote_id) {
         if (items.some(i => i.lote_id === inventory.lote_id)) {
           toast.error('Este lote ya está en la lista.');
           return;
         }

         const parsedQty = Number(inventory.quantity) || 0;
         setItems(prev => [...prev, {
           id: qr.id,
           qrCode: code,
           lote_id: inventory.lote_id,
           folio: inventory.folio || 'N/A',
           material_id: inventory.material?.id,
           materialName: inventory.material?.name || 'Material',
           maxQuantity: parsedQty,
           quantity: parsedQty // Default to max
         }]);
         setScanInput('');
      } else {
         toast.error('El QR escaneado no está asociado a un lote en inventario válido.');
      }
    } catch (e) {
      toast.error('Error al resolver QR. Verifique que exista y esté activo.');
    }
  };

  const handleAddMaterial = async () => {
    if (!selectedMaterialId) return;
    const material = materials.find((m: any) => m.id === Number(selectedMaterialId));
    if (!material) return;

    if (items.some(i => i.material_id === material.id && !i.lote_id)) {
      toast.error('Este material ya está en la lista de consumo.');
      return;
    }

    try {
      const response = await axiosClient.get(`/warehouse/inventory?material_id=${material.id}`);
      const inventoryItems = response.data?.data?.items || response.data?.items || [];
      const inventory = inventoryItems.find((i: any) => Number(i.material_id) === material.id);
      
      const maxQuantity = inventory ? Number(inventory.amount) : 0;

      if (maxQuantity <= 0) {
        toast.error('No hay inventario disponible para este material.');
        return;
      }

      setItems(prev => [...prev, {
        material_id: material.id,
        materialName: material.name,
        maxQuantity,
        quantity: 1
      }]);
      setSelectedMaterialId('');
    } catch (e) {
      toast.error('Error al obtener inventario del material.');
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

  if (isScanning) {
    return (
      <CameraScanner 
        title="Escanear Material a Consumir"
        onScan={(code) => {
          setIsScanning(false);
          handleScan(code);
        }}
        onClose={() => setIsScanning(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
      <div className="bg-card w-full sm:max-w-2xl max-h-[82dvh] sm:max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col">
        
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
        <div className="px-4 py-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 sm:gap-6">
          
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

          <div className="border-t border-border pt-4 sm:pt-6 flex flex-col gap-3">
            {/* Título + controles de escaneo */}
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-foreground">Materiales a Consumir</h4>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <SearchSelect 
                    options={materials}
                    value={selectedMaterialId}
                    onChange={setSelectedMaterialId}
                    getLabel={(m: any) => `${m.internal_code} - ${m.name}`}
                    getValue={(m: any) => m.id.toString()}
                    placeholder="Buscar material..."
                    emptyMessage="No se encontraron materiales"
                  />
                </div>
                <Button variant="secondary" onClick={() => setIsScanning(true)} className="shrink-0 group" title="Escanear QR">
                  <QrCode size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>
                <Button variant="primary" onClick={handleAddMaterial} className="shrink-0" disabled={!selectedMaterialId}>
                  <Plus size={16} className="mr-1.5" />
                  <span className="hidden sm:inline">Agregar</span>
                  <span className="sm:hidden">Add</span>
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
                      <th className="px-4 py-3 text-left font-black uppercase text-muted-foreground">Folio / Factura</th>
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
                          <p className="text-xs text-muted-foreground">{item.qrCode || 'Asignación FIFO'}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.folio || 'N/A'}</td>
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-secondary/20 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shrink-0">
          {/* Stats */}
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
          {/* Acciones */}
          <div className="flex gap-2 sm:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleConsume()} 
              disabled={isSubmitting || items.length === 0 || !orderNumber}
              className="flex-1 sm:flex-none whitespace-nowrap"
            >
              {isSubmitting && <Plus className="animate-spin mr-2" size={16} />}
              <span className="hidden sm:inline">Confirmar Consumo</span>
              <span className="sm:hidden">Confirmar</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
