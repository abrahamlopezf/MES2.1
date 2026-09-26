import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X, Search, Package, Plus, Trash, AlertCircle, Check, Pencil } from 'lucide-react';
import axiosClient from '../../../../api/axiosClient';
import { useAuthStore } from '../../../../store/authStore';
import { downloadConsumptionOrderPdf } from '../../utils/pdfUtils';

interface CreateConsumptionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateConsumptionOrderModal: React.FC<CreateConsumptionOrderModalProps> = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const filteredInventory = inventory.filter(inv => 
    inv.material?.name?.toLowerCase().includes(search.toLowerCase()) || 
    inv.material?.material_code?.toLowerCase().includes(search.toLowerCase())
  );
  
  const [submitting, setSubmitting] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const { user } = useAuthStore() as any;
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(user?.area?.id?.toString() || '');

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      if (!user?.area?.id) {
        fetchAreas();
      } else {
        setSelectedAreaId(user.area.id.toString());
      }
    }
  }, [isOpen, user]);

  const fetchAreas = async () => {
    try {
      const res = await axiosClient.get('/areas');
      setAreas(res.data.data || res.data);
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/warehouse/inventory');
      const data = res.data.data || res.data;
      setInventory(data.items || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (invItem: any) => {
    if (items.find(i => i.material_id === invItem.material_id)) return;
    setItems([...items, { ...invItem, req_quantity: 1, isConfirmed: false }]);
  };

  const updateItemQty = (material_id: number, qty: number) => {
    setItems(items.map(i => {
      if (i.material_id === material_id) {
        return { ...i, req_quantity: qty };
      }
      return i;
    }));
  };

  const toggleConfirmItem = (material_id: number) => {
    setItems(items.map(i => {
      if (i.material_id === material_id) {
        if (!i.isConfirmed && i.req_quantity < 1) {
          toast.error(`La cantidad debe ser mayor a 0 para ${i.material?.name}`);
          return i;
        }
        return { ...i, isConfirmed: !i.isConfirmed };
      }
      return i;
    }));
  };

  const removeItem = (material_id: number) => {
    setItems(items.filter(i => i.material_id !== material_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert('Debes agregar al menos un material');
    
    // Validate quantities
    for (const item of items) {
      if (item.req_quantity < 1) return alert(`La cantidad mínima permitida para ${item.material.name} es 1`);
    }

    try {
      setSubmitting(true);
      const areaIdToSubmit = user?.area?.id ? user.area.id : parseInt(selectedAreaId);
      
      if (!areaIdToSubmit) {
        setSubmitting(false);
        return alert('Por favor selecciona un área solicitante');
      }

      const payload = {
        requesting_area_id: areaIdToSubmit,
        notes,
        items: items.map(i => ({
          material_id: i.material_id,
          quantity: i.req_quantity
        }))
      };

      const res = await axiosClient.post('/warehouse/consumption-orders', payload);
      const orderId = res.data.uuid;
      
      toast.success(`Orden de consumo ${res.data.order_number} creada exitosamente.`);
      toast.info('Generando PDF...');

      try {
        // Fetch full order to print
        const orderRes = await axiosClient.get(`/warehouse/consumption-orders/${orderId}`);
        await downloadConsumptionOrderPdf(orderRes.data);
        toast.success('PDF descargado exitosamente.');
      } catch (pdfErr) {
        console.error('Error generating PDF:', pdfErr);
        toast.error('Ocurrió un error al generar el PDF.');
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Error creando orden');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 mt-12 lg:mt-0">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Nueva Orden de Consumo</h2>
            <p className="text-sm text-muted-foreground">Solicitar materiales al almacén</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Selector de Área si no tiene una asignada */}
              {!user?.area?.id && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-foreground mb-2">Área Solicitante</label>
                  <select 
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-colors shadow-sm"
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona el área que solicita el material...</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dropdown Buscador */}
              <div className="mb-6 relative">
                <label className="block text-sm font-semibold text-foreground mb-2">Buscar y agregar material</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre o código..." 
                    className="w-full !pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none transition-colors shadow-sm"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {search && (
                    <button 
                      type="button"
                      onClick={() => { setSearch(''); setShowDropdown(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Resultados del dropdown */}
                {showDropdown && (
                  <div className="absolute z-[110] top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Cargando inventario...</div>
                    ) : filteredInventory.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron materiales.</div>
                    ) : (
                      filteredInventory.map(inv => (
                        <div 
                          key={inv.material_id} 
                          className="p-3 border-b border-border hover:bg-muted/30 cursor-pointer flex justify-between items-center transition-colors"
                          onClick={() => {
                            addItem(inv);
                            setSearch('');
                            setShowDropdown(false);
                          }}
                        >
                          <div>
                            <div className="font-bold text-foreground text-sm">{inv.material?.name}</div>
                            <div className="text-xs text-muted-foreground">{inv.material?.material_code} - {inv.material?.ranking?.name}</div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            {items.some(i => i.material_id === inv.material_id) && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">AGREGADO</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {/* Overlay invisible para cerrar el dropdown al hacer click fuera */}
                {showDropdown && (
                  <div className="fixed inset-0 z-[105]" onClick={() => setShowDropdown(false)}></div>
                )}
              </div>

              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package size={16} className="text-primary"/> Materiales Seleccionados
              </h3>
              
              {items.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                  <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <span className="text-muted-foreground text-sm">Busca un material arriba<br/>para agregarlo a la orden.</span>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.material_id} className="flex gap-4 items-start p-4 rounded-xl border border-border bg-muted/5 relative group">
                      <button 
                        type="button"
                        onClick={() => removeItem(item.material_id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={12} />
                      </button>
                      
                      <div className="flex-1">
                        <div className="font-bold text-foreground text-sm">{item.material?.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.material?.material_code} - {item.material?.ranking?.name}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {!item.isConfirmed ? (
                          <div className="flex items-center gap-2">
                            <div className="w-28 relative flex items-center">
                              <input 
                                type="number" 
                                min="1" 
                                step="1"
                                value={item.req_quantity === 0 ? '' : item.req_quantity}
                                onChange={(e) => {
                                  let val = parseFloat(e.target.value);
                                  if (isNaN(val)) val = 0;
                                  if (val < 0) val = Math.abs(val);
                                  updateItemQty(item.material_id, val);
                                }}
                                className="w-full px-3 py-1.5 pr-8 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none font-bold text-center text-primary"
                              />
                              <span className="absolute right-3 text-xs text-muted-foreground font-medium pointer-events-none">{item.material?.unit?.abbreviation}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleConfirmItem(item.material_id)}
                              className="p-1.5 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors shadow-sm"
                              title="Confirmar cantidad"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                            <div className="text-sm font-black text-primary">
                              {item.req_quantity} <span className="text-xs text-muted-foreground font-medium">{item.material?.unit?.abbreviation}</span>
                            </div>
                            <div className="w-px h-4 bg-border"></div>
                            <button
                              type="button"
                              onClick={() => toggleConfirmItem(item.material_id)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Editar cantidad"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 border-t border-border pt-6">
                <label className="block text-sm font-semibold text-foreground mb-2">Notas / Justificación</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones para almacén o motivo del consumo..."
                  className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none resize-none h-24"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/5">
              <div className="flex items-start gap-3 mb-4 p-3 bg-info/10 text-info text-xs rounded-lg border border-info/20">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="m-0">El sistema apartará automáticamente los lotes utilizando el método FIFO (Primeras Entradas, Primeras Salidas).</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-background border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitting || items.length === 0 || items.some(i => !i.isConfirmed)}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? 'Creando...' : 'Generar Orden'}
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>,
    document.body
  );
};
