import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGenerateBatchMutation } from '../hooks/useGenerateBatchMutation';
import { useIdentityBatchesQuery } from '../hooks/useIdentityBatches';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { Plus, X, Printer, TreeDeciduous, ChevronDown, ChevronUp, Package2, Send } from 'lucide-react';
import nomenclature from '@shared/config/nomenclature.json';
import { useAuth } from '../context/AuthContext';

const generateBatchSchema = z.object({
  mainAreaId: z.string().min(1, 'Debes seleccionar un área principal'),
  subAreaId: z.string().min(1, 'La subcategoría es requerida'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  amount: z.number().min(1, 'La cantidad debe ser mayor a 0').max(50000, 'Máximo 50,000 etiquetas'),
});

type GenerateBatchFormValues = z.infer<typeof generateBatchSchema>;

export function GenerateBatchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  
  const mutation = useGenerateBatchMutation();
  const { data: allBatches, isLoading: loadingBatches } = useIdentityBatchesQuery();
  
  // Si no es admin, filtramos los lotes para simular que solo ve los de su área (Ej: EXT, MIX)
  const batches = useMemo(() => {
    if (!allBatches) return [];
    if (isAdmin) return allBatches;
    // Mock: Supervisor de Extrusión ve EXT y MIX
    return allBatches.filter(b => b.areaId === 'EXT' || b.areaId === 'MIX');
  }, [allBatches, isAdmin]);

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const expandedBatch = useMemo(() => {
    if (!expandedBatchId || !batches) return null;
    return batches.find(b => String(b.id) === String(expandedBatchId)) || null;
  }, [batches, expandedBatchId]);
  
  const loadingBatchDetails = false;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<GenerateBatchFormValues>({
    resolver: zodResolver(generateBatchSchema),
    defaultValues: {
      mainAreaId: isAdmin ? nomenclature.areas[0].id : 'EXT',
      subAreaId: isAdmin ? nomenclature.areas[0].subcategories[0].id : 'EXT',
      categoryId: isAdmin ? nomenclature.areas[0].subcategories[0].categories[0].id : 'PTI',
      amount: 1,
    }
  });

  const selectedMainAreaId = watch('mainAreaId');
  const selectedSubAreaId = watch('subAreaId');

  const availableAreas = nomenclature.areas;
  const availableSubcategories = useMemo(() => {
    return availableAreas.find(a => a.id === selectedMainAreaId)?.subcategories || [];
  }, [selectedMainAreaId]);
  
  const availableCategories = useMemo(() => {
    return availableSubcategories.find(s => s.id === selectedSubAreaId)?.categories || [];
  }, [selectedSubAreaId, availableSubcategories]);

  const getSubcategoryData = (id: string) => {
    for (const area of nomenclature.areas) {
      const sub = area.subcategories.find(s => s.id === id);
      if (sub) return { ...sub, areaName: area.name, areaId: area.id };
    }
    return null;
  };

  const onSubmit = (data: GenerateBatchFormValues) => {
    if (!isAdmin) {
      // Simular petición
      toast.success('Solicitud enviada a los Administradores');
      setIsModalOpen(false);
      reset();
      return;
    }

    mutation.mutate({
      areaId: data.subAreaId,
      nomenclature_prefix: `${data.mainAreaId}-${data.subAreaId}-${data.categoryId}`,
      amount: data.amount,
      plantId: 'MTY',
      tokenType: 'QR' as any,
      requestedBy: user?.name || 'admin'
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
        toast.success('✨ Lote generado exitosamente');
      },
      onError: (error: any) => {
        toast.error('Error al generar el lote: ' + (error?.message || 'Desconocido'));
        console.error(error);
      }
    });
  };

  const onErrorForm = (errors: any) => {
    toast.error('Error de validación: ' + Object.keys(errors).join(', '));
  };

  const handleReprint = () => {
    if (!expandedBatch || !expandedBatch.tokens.length) {
      toast.error('No hay códigos QR para imprimir en este lote.');
      return;
    }

    // Pipeline: Obtener QRs -> Generar HTML/Vista Previa -> Imprimir/Descargar PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor permite las ventanas emergentes (pop-ups) para ver la vista previa.');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Lote ${expandedBatch.batchNumber}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; }
            .label { border: 1px dashed #000; width: 250px; padding: 15px; margin: 10px; display: inline-block; text-align: center; }
            .code { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
            .area { font-size: 10px; background: #000; color: #fff; padding: 2px 5px; display: inline-block; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Imprimir / Guardar como PDF</button>
            <p>Se ha generado la vista previa de <b>${expandedBatch.tokens.length}</b> etiquetas.</p>
          </div>
          <div>
            ${expandedBatch.tokens.map(t => `
              <div class="label">
                <div class="code">${t.industrialCode}</div>
                <div class="area">${expandedBatch.areaId}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    toast.success('Vista previa de impresión generada.');
  };

  const handleTraceability = (tokenId: string) => {
    navigate(`/traceability/genealogy?tokenId=${tokenId}`);
  };

  const toggleExpand = (batchId: string) => {
    setExpandedBatchId(prev => prev === batchId ? null : batchId);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col">
      
      {/* HEADER ROW */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Centro de Identidad</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona y genera lotes de QRs para trazabilidad.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 shadow-sm"
        >
          {isAdmin ? <Plus size={18} /> : <Send size={18} />}
          {isAdmin ? 'Generar Nuevo Lote' : 'Solicitar QRs'}
        </button>
      </div>

      {/* BATCH LIST MAIN AREA */}
      <div className="bg-card rounded-lg border border-border flex flex-col shadow-sm">
        <div className="p-6 border-b border-border bg-muted/10">
          <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
            <Package2 size={24} className="text-muted-foreground" />
            Lotes {isAdmin ? 'Generados' : 'de mi Área'}
          </h2>
        </div>
        
        <div className="p-6 bg-background">
          {loadingBatches ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">Cargando lotes...</div>
          ) : batches && batches.length > 0 ? (
            <div className="space-y-4">
              {batches.map(batch => {
                const isExpanded = expandedBatchId === batch.id;
                const subData = getSubcategoryData(batch.areaId);
                
                return (
                  <div key={batch.id} className="border border-border rounded-lg overflow-hidden bg-card shadow-sm transition-all duration-200">
                    
                    {/* ACCORDION HEADER */}
                    <div 
                      onClick={() => toggleExpand(batch.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-2 rounded-md">
                          <Printer size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{batch.batchNumber}</h3>
                          <p className="text-xs text-muted-foreground">
                            {batch.generatedAmount} etiquetas • {new Date(batch.generatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full flex items-center gap-2">
                          {subData && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subData.color }}></span>
                          )}
                          {subData ? `${subData.areaName} - ${subData.name}` : batch.areaId}
                        </span>
                        {isExpanded ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                      </div>
                    </div>

                    {/* ACCORDION BODY (EXPANDED) */}
                    {isExpanded && (
                      <div className="p-6 border-t border-border bg-muted/10">
                        {loadingBatchDetails ? (
                          <div className="py-8 text-center text-muted-foreground text-sm">Obteniendo detalles del lote...</div>
                        ) : expandedBatch ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
                            
                            {/* Batch Info */}
                            <div className="flex flex-col h-full">
                              <div>
                                <h4 className="font-bold text-foreground text-sm mb-4 border-b border-border pb-2 uppercase tracking-wider">Detalles del Lote</h4>
                                <div className="space-y-3 text-sm text-muted-foreground">
                                  <div className="flex justify-between">
                                    <span>Lote ID:</span>
                                    <strong className="text-foreground">{expandedBatch.batchNumber}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Área / Subcategoría:</span>
                                    <strong className="text-foreground">
                                      {subData ? `${subData.areaName} - ${subData.name}` : expandedBatch.areaId}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Generado por:</span>
                                    <strong className="text-foreground">{expandedBatch.requestedBy}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total QRs Generados:</span>
                                    <strong className="text-foreground">{expandedBatch.generatedAmount}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-4 w-full mt-auto pt-6">
                                <button 
                                  onClick={handleReprint}
                                  className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-md transition-colors border border-border text-sm"
                                >
                                  <Printer size={16} />
                                  Reimprimir Lote
                                </button>
                              </div>
                            </div>

                            {/* Tokens View */}
                            <div className="bg-background rounded-lg border border-border overflow-hidden flex flex-col h-[300px]">
                              <div className="bg-muted/50 p-3 border-b border-border font-semibold text-sm">
                                Códigos ({expandedBatch.tokens.length})
                              </div>
                              <div className="overflow-y-auto p-4 space-y-3 flex-1">
                                {expandedBatch.tokens.map((token: any) => (
                                  <div key={token.tokenId} className="flex flex-col p-3 rounded-md border border-border/50 bg-card gap-3">
                                    
                                    {/* QR Físico Simulado */}
                                    <div className="flex gap-4 items-center">
                                      <div className="bg-white p-2 rounded-lg border border-slate-200 shrink-0 relative overflow-hidden flex flex-col items-center">
                                        <QRCodeCanvas value={token.industrialCode} size={64} />
                                        {/* Marca visual física del QR */}
                                        <div 
                                          className="w-full text-center text-[10px] font-bold mt-1 text-white uppercase"
                                          style={{ backgroundColor: subData?.color || '#000' }}
                                        >
                                          {expandedBatch.areaId}
                                        </div>
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs font-bold truncate text-foreground">{token.industrialCode}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                          token.status === 'VIRGIN' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        }`}>
                                          {token.status}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Trazabilidad Action */}
                                    {token.status !== 'VIRGIN' && (
                                      <button 
                                        onClick={() => handleTraceability(token.industrialCode)}
                                        className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium py-1.5 px-3 rounded text-xs transition-colors"
                                      >
                                        <TreeDeciduous size={14} />
                                        Ver Trazabilidad
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="py-8 text-center text-destructive text-sm">Error al cargar los detalles.</div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg p-12">
              <Package2 size={48} className="opacity-20 mb-4" />
              <p className="text-center">No hay lotes {isAdmin ? 'generados' : 'asignados a tu área'} aún.</p>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE / REQUEST BATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-lg text-foreground">
                {isAdmin ? 'Generar Nuevo Lote' : 'Solicitar QRs a Sistemas'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onErrorForm)} className="p-6 space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Área Principal</label>
                <select 
                  {...register('mainAreaId')} 
                  disabled={!isAdmin}
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                >
                  {availableAreas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.id})
                    </option>
                  ))}
                </select>
                {errors.mainAreaId && <span className="text-xs text-destructive">{errors.mainAreaId.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subárea (Asignación)</label>
                <select 
                  {...register('subAreaId')} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  {availableSubcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.id})
                    </option>
                  ))}
                </select>
                {errors.subAreaId && <span className="text-xs text-destructive">{errors.subAreaId.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categoría</label>
                <select 
                  {...register('categoryId')} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.id})
                    </option>
                  ))}
                </select>
                {errors.categoryId && <span className="text-xs text-destructive">{errors.categoryId.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Cantidad a {isAdmin ? 'generar' : 'solicitar'}</label>
                <input 
                  type="number" 
                  {...register('amount', { valueAsNumber: true })} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="Ej. 100"
                />
                {errors.amount && <span className="text-xs text-destructive">{errors.amount.message}</span>}
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2.5 px-4 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {mutation.isPending ? 'Procesando...' : (isAdmin ? 'Generar Lote' : 'Enviar Solicitud')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
