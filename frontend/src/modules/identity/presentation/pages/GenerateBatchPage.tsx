import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGenerateBatchMutation } from '../hooks/useGenerateBatchMutation';
import { useIdentityBatchesQuery, downloadBatchPdf, downloadQrPdf } from '../hooks/useIdentityBatches';
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

  const handleReprint = async () => {
    if (!expandedBatch || !expandedBatch.tokens.length) {
      toast.error('No hay códigos QR para imprimir en este lote.');
      return;
    }

    try {
      toast.info('Generando PDF del lote, por favor espera...');
      await downloadBatchPdf(expandedBatch.id, expandedBatch.batchNumber);
      toast.success('PDF descargado exitosamente.');
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al generar el PDF.');
    }
  };

  const handlePrintSingle = async (tokenId: string, qrCode: string) => {
    try {
      toast.info('Generando PDF del QR...');
      await downloadQrPdf(tokenId, qrCode);
      toast.success('PDF descargado exitosamente.');
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al generar el PDF.');
    }
  };

  const handleTraceability = (tokenId: string) => {
    navigate(`/traceability/genealogy?tokenId=${tokenId}`);
  };

  const toggleExpand = (batchId: string) => {
    setExpandedBatchId(prev => prev === batchId ? null : batchId);
  };

  return (
    <div className="space-y-4 px-4 sm:px-6 md:px-8 py-4 md:py-6 pb-32 sm:pb-12 overflow-x-hidden flex flex-col">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Centro de Identidad</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona y genera lotes de QRs para trazabilidad.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 sm:py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
        >
          {isAdmin ? <Plus size={18} /> : <Send size={18} />}
          {isAdmin ? 'Generar Nuevo Lote' : 'Solicitar QRs'}
        </button>
      </div>

      {/* BATCH LIST MAIN AREA (SPLIT SCREEN MASTER-DETAIL) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Package2 size={24} className="text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Lotes {isAdmin ? 'Generados' : 'de mi Área'}
          </h2>
        </div>
        
        <div className="w-full">
          {loadingBatches ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">Cargando lotes...</div>
          ) : batches && batches.length > 0 ? (
            <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
              
              {/* MASTER LIST (LEFT PANE) */}
              <div className={`w-full lg:w-1/3 xl:w-1/4 shrink-0 space-y-4 lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto pr-2 ${expandedBatchId ? 'hidden lg:block' : 'block'}`}>
                {batches.map(batch => {
                  const isExpanded = expandedBatchId === batch.id;
                  const subData = getSubcategoryData(batch.areaId);
                  
                  return (
                    <div 
                      key={batch.id} 
                      onClick={() => toggleExpand(batch.id)}
                      className={`border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                        isExpanded 
                          ? 'border-primary ring-1 ring-primary shadow-md bg-card/90' 
                          : 'border-border bg-card hover:bg-muted/50 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col p-4 gap-3">
                        <div className="flex items-center gap-3 min-w-0 w-full">
                          <div className={`p-2 rounded-md shrink-0 ${isExpanded ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                            <Printer size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate">{batch.batchNumber}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {batch.generatedAmount} etiquetas • {new Date(batch.generatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full border-t border-border pt-3">
                          <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full flex items-center gap-2 truncate max-w-full">
                            {subData && (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subData.color }}></span>
                            )}
                            <span className="truncate">{subData ? `${subData.areaName} - ${subData.name}` : batch.areaId}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DETAIL PANE (RIGHT PANE) */}
              <div className={`w-full lg:flex-1 ${expandedBatchId ? 'block animate-in fade-in slide-in-from-right-8 duration-300' : 'hidden lg:flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-card/30 min-h-[500px]'}`}>
                {expandedBatchId ? (
                  <div className="bg-card rounded-xl border border-border shadow-sm p-6 w-full lg:min-h-[calc(100vh-250px)]">
                    
                    <div className="flex items-center gap-2 mb-6 lg:hidden">
                      <button 
                        onClick={() => toggleExpand(expandedBatchId)} 
                        className="text-muted-foreground p-2 -ml-2 rounded-md hover:bg-muted bg-muted/50"
                      >
                        Volver a la lista
                      </button>
                    </div>

                    {loadingBatchDetails ? (
                      <div className="py-12 text-center text-muted-foreground animate-pulse">Obteniendo detalles del lote...</div>
                    ) : expandedBatch ? (
                      <div className="flex flex-col gap-8 h-full">
                        
                        {/* Batch Info */}
                        <div className="flex flex-col xl:flex-row gap-8">
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground text-sm mb-4 border-b border-border pb-2 uppercase tracking-wider flex justify-between items-center">
                              <span>Detalles del Lote</span>
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">{expandedBatch.batchNumber}</span>
                            </h4>
                            <div className="space-y-3 text-sm text-muted-foreground bg-muted/20 p-4 rounded-lg border border-border/50">
                              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span>Área / Subcategoría:</span>
                                <strong className="text-foreground text-right ml-4">
                                  {getSubcategoryData(expandedBatch.areaId) ? `${getSubcategoryData(expandedBatch.areaId)?.areaName} - ${getSubcategoryData(expandedBatch.areaId)?.name}` : expandedBatch.areaId}
                               </strong>
                              </div>
                              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span>Generado por:</span>
                                <strong className="text-foreground text-right ml-4">{expandedBatch.requestedBy}</strong>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Total QRs Generados:</span>
                                <strong className="text-foreground font-mono bg-background px-2 py-0.5 rounded border border-border text-right ml-4">{expandedBatch.generatedAmount}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col justify-end xl:w-64 pt-6 xl:pt-0 shrink-0">
                            <button 
                              onClick={handleReprint}
                              className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-3 px-4 rounded-lg transition-colors border border-border shadow-sm"
                            >
                              <Printer size={18} />
                              Reimprimir Lote Completo
                            </button>
                          </div>
                        </div>

                        {/* Tokens View */}
                        <div className="bg-background rounded-lg border border-border overflow-hidden flex flex-col flex-1 min-h-[300px]">
                          <div className="bg-muted/50 p-3 border-b border-border font-bold text-sm flex justify-between items-center">
                            <span>Códigos Físicos del Lote</span>
                            <span className="bg-background px-2 py-0.5 rounded-full border border-border text-xs">{expandedBatch.tokens.length} unidades</span>
                          </div>
                          <div className="overflow-y-auto p-4 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {expandedBatch.tokens.map((token: any) => (
                                <div key={token.tokenId} className="flex flex-col p-4 rounded-xl border border-border/60 bg-card hover:border-primary/50 transition-colors shadow-sm gap-4 group">
                                  
                                  {/* QR Físico Simulado */}
                                  <div className="flex gap-4 items-center">
                                    <div className="bg-white p-2 rounded-lg border border-slate-200 shrink-0 relative overflow-hidden flex flex-col items-center shadow-sm">
                                      <QRCodeCanvas value={token.industrialCode} size={64} />
                                      {/* Marca visual física del QR */}
                                      <div 
                                        className="w-full text-center text-[9px] font-black mt-1 text-white uppercase tracking-wider"
                                        style={{ backgroundColor: getSubcategoryData(expandedBatch.areaId)?.color || '#000' }}
                                      >
                                        {expandedBatch.areaId}
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                      <p className="font-mono text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{token.industrialCode}</p>
                                      <div className="mt-1.5">
                                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                                          token.status === 'UNASSIGNED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        }`}>
                                          {token.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Trazabilidad & Print Actions */}
                                  <div className="flex flex-col gap-2 w-full mt-auto pt-3 border-t border-border/50">
                                    {token.status !== 'UNASSIGNED' && (
                                      <button 
                                        onClick={() => handleTraceability(token.industrialCode)}
                                        className="w-full flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 px-2 rounded-md text-[11px] transition-colors"
                                      >
                                        <TreeDeciduous size={14} className="shrink-0" />
                                        <span>Trazabilidad</span>
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handlePrintSingle(token.tokenId, token.industrialCode)}
                                      className="w-full flex items-center justify-center gap-1.5 bg-secondary/50 hover:bg-secondary text-secondary-foreground font-bold py-2 px-2 rounded-md text-[11px] transition-colors"
                                    >
                                      <Printer size={14} className="shrink-0" />
                                      <span>Imprimir</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="py-8 text-center text-destructive text-sm">Error al cargar los detalles.</div>
                    )}
                  </div>
                ) : (
                  <>
                    <Package2 size={56} className="opacity-10 mb-4 text-primary" />
                    <h3 className="text-lg font-bold text-foreground mb-1">Ningún lote seleccionado</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      Selecciona un lote de la lista izquierda para visualizar su genealogía y los códigos QR generados.
                    </p>
                  </>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg p-12 bg-card/30">
              <Package2 size={48} className="opacity-20 mb-4" />
              <p className="text-center font-medium">No hay lotes {isAdmin ? 'generados' : 'asignados a tu área'} aún.</p>
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
