import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, X, QrCode, Plus, Trash2, ShieldAlert, Search } from 'lucide-react';
import { Button, Input } from '../../../../design-system';
import { SearchSelect } from '../../../../design-system/components/Input/SearchSelect';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

export interface BajaBottomSheetPresenterProps {
  isOpen: boolean;
  onClose: () => void;
  isResolutionMode: boolean;
  isRequestMode: boolean;
  loadingRequest: boolean;
  tiposBaja: any[];
  items: any[];
  materials: any[];
  tipoBajaId: string;
  notes: string;
  totalSelectedQuantity: number;
  isSubmitting: boolean;
  scanInput: string;
  step: 'SELECT_METHOD' | 'SCANNING' | 'FORM';
  onSetStep: (step: 'SELECT_METHOD' | 'SCANNING' | 'FORM') => void;
  isScanning: boolean;
  selectedMaterialId: string;
  isMaterialLocked: boolean;
  loteSearch?: string;
  onChangeLoteSearch?: (val: string) => void;
  onChangeTipoBajaId: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onScanInput: (val: string) => void;
  onScanSubmit: (val: string) => void;
  onToggleScanning: () => void;
  onChangeSelectedMaterial: (val: string) => void;
  onAddMaterial?: () => void;
  onUpdateQuantity: (idx: number, val: number) => void;
  onRemoveItem: (idx: number) => void;
  onResolveRequest: (status: 'APPROVED' | 'REJECTED') => void;
  onCreateRequest: () => void;
  onDirectDispose: () => void;
}

export const BajaBottomSheetPresenter: React.FC<BajaBottomSheetPresenterProps> = ({
  isOpen,
  onClose,
  isResolutionMode,
  isRequestMode,
  loadingRequest,
  tiposBaja,
  items,
  materials,
  tipoBajaId,
  notes,
  totalSelectedQuantity,
  isSubmitting,
  scanInput,
  step,
  onSetStep,
  isScanning,
  selectedMaterialId,
  isMaterialLocked,
  loteSearch = '',
  onChangeLoteSearch,
  onChangeTipoBajaId,
  onChangeNotes,
  onScanInput,
  onScanSubmit,
  onToggleScanning,
  onChangeSelectedMaterial,
  onAddMaterial,
  onUpdateQuantity,
  onRemoveItem,
  onResolveRequest,
  onCreateRequest,
  onDirectDispose
}) => {
  const [animateIn, setAnimateIn] = useState(false);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => setAnimateIn(true));
      setCurrentY(0);
    } else {
      document.body.style.overflow = 'unset';
      setAnimateIn(false);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      sheetRef.current!.dataset.startY = e.touches[0].clientY.toString();
      sheetRef.current!.style.transition = 'none';
    },
    onTouchMove: (e: React.TouchEvent) => {
      const startY = parseFloat(sheetRef.current!.dataset.startY || '0');
      const currentYMove = e.touches[0].clientY;
      const delta = Math.max(0, currentYMove - startY);
      setCurrentY(delta);
    },
    onTouchEnd: (onCloseCb: () => void) => {
      sheetRef.current!.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';
      if (currentY > window.innerHeight * 0.25) {
        onCloseCb();
      } else {
        setCurrentY(0);
      }
    }
  };

  if (!isOpen && !animateIn) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[95dvh] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className={`px-5 pb-4 sm:pt-5 border-b border-border flex justify-between items-center ${isResolutionMode ? 'bg-warning/10 border-warning/20' : 'bg-card'}`}>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Package size={20} className={isResolutionMode ? 'text-warning' : 'text-foreground'} />
            <span className={isResolutionMode ? 'text-warning' : 'text-foreground'}>
              {isResolutionMode ? 'Autorización de Baja' : 'Nueva Baja de Material'}
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto flex-1 flex flex-col bg-background">
          
          {step === 'SCANNING' ? (
            <div className="flex-1 flex flex-col justify-center items-center py-4 px-5">
              <div className="relative w-full max-w-[300px]">
                <button 
                  onClick={() => onSetStep(items.length > 0 ? 'FORM' : 'SELECT_METHOD')}
                  className="absolute -top-3 -right-3 z-10 p-2 bg-background border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full shadow-md transition-colors"
                  title="Cerrar cámara"
                >
                  <X size={16} />
                </button>
                <CameraScanner 
                  title="Alinee el código QR en el recuadro"
                  inline={true}
                  onScan={(code) => {
                    onScanSubmit(code);
                  }}
                  onClose={() => onSetStep(items.length > 0 ? 'FORM' : 'SELECT_METHOD')}
                />
              </div>
            </div>
          ) : step === 'SELECT_METHOD' ? (
            <div className="p-5 py-8 flex flex-col items-center justify-center gap-6">
              <div className="text-center space-y-2">
                <QrCode size={48} className="mx-auto text-primary opacity-80" />
                <h4 className="font-bold text-foreground text-xl">¿Cómo desea buscar el material?</h4>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">Seleccione si desea utilizar la cámara para leer el código QR del lote o buscarlo manualmente en el catálogo.</p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-4">
                <Button variant="primary" size="lg" onClick={() => onSetStep('SCANNING')} className="font-bold py-6 text-lg rounded-xl shadow-md">
                  <QrCode className="mr-2" /> Escanear Código QR
                </Button>
                <Button variant="secondary" size="lg" onClick={() => onSetStep('FORM')} className="font-bold py-6 text-lg rounded-xl">
                  Selección Manual
                </Button>
              </div>
            </div>
          ) : loadingRequest && isResolutionMode ? (
            <div className="p-5 py-12 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p>Cargando detalles de la solicitud...</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-6">
              {isResolutionMode && (
                <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="text-warning shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-warning text-sm">Requiere Autorización</h4>
                    <p className="text-xs text-warning/80 mt-1">Revise los detalles de la baja solicitada. Una vez aprobada, el inventario será descontado permanentemente.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-foreground">Tipo de Baja <span className="text-destructive">*</span></label>
                  <select 
                    value={tipoBajaId}
                    onChange={e => onChangeTipoBajaId(e.target.value)}
                    disabled={isResolutionMode || isSubmitting}
                    className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Seleccione el motivo...</option>
                    {tiposBaja.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-foreground">Notas (Opcional)</label>
                  <Input 
                    placeholder="Motivo o detalles adicionales..." 
                    value={notes}
                    onChange={e => onChangeNotes(e.target.value)}
                    disabled={isResolutionMode || isSubmitting}
                    className="h-12 rounded-xl bg-background shadow-sm"
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-5 flex flex-col gap-4">
                {!isResolutionMode && (
                  <div className="flex flex-col gap-3">
                    <h4 className="font-bold text-foreground">Materiales a Dar de Baja</h4>
                    {isScanning ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escanee código QR..."
                          value={scanInput}
                          onChange={e => onScanInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onScanSubmit(scanInput);
                            }
                          }}
                          autoFocus
                          className="flex-1 h-12 rounded-xl bg-background font-mono"
                        />
                        <Button variant="secondary" onClick={onToggleScanning} className="shrink-0 rounded-xl px-4 h-12">
                          <X size={18} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <SearchSelect 
                            options={materials}
                            value={selectedMaterialId}
                            onChange={onChangeSelectedMaterial}
                            getLabel={(m: any) => `${m.internal_code} - ${m.name}`}
                            getValue={(m: any) => m.id.toString()}
                            placeholder="Buscar material..."
                            emptyMessage="No se encontraron materiales"
                            disabled={isMaterialLocked}
                          />
                        </div>
                        {!isMaterialLocked && (
                          <Button variant="secondary" onClick={() => onSetStep('SCANNING')} className="shrink-0 group rounded-xl px-4 h-12" title="Escanear QR">
                            <QrCode size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="bg-secondary/10 border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center mt-2">
                    <QrCode size={40} className="text-muted-foreground mb-3 opacity-50" />
                    <p className="font-bold text-foreground mb-1">No hay materiales seleccionados</p>
                    <p className="text-sm text-muted-foreground">Escanee un código QR para agregar lotes a dar de baja.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 mt-2">
                    {isMaterialLocked && items.length > 1 && (
                      <div className="relative mb-2">
                        <Input 
                          placeholder="Buscar por lote, folio o código QR..." 
                          value={loteSearch}
                          onChange={e => onChangeLoteSearch?.(e.target.value)}
                          className="!pl-10 h-11 rounded-xl bg-background shadow-sm w-full"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Search size={18} />
                        </div>
                      </div>
                    )}
                    
                    {items.map((item, originalIdx) => ({...item, originalIdx})).filter(item => {
                      if (!loteSearch) return true;
                      const term = loteSearch.toLowerCase();
                      return (item.folio?.toLowerCase().includes(term) || String(item.lote_id).includes(term) || item.qrCode?.toLowerCase().includes(term));
                    }).map((item, idx) => (
                      <div key={item.originalIdx} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-sm relative">
                        <div className="flex justify-between items-start">
                          <div className="pr-8">
                            <p className="font-bold text-foreground text-sm">{item.materialName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.qrCode || 'Lote Asignado'} • {item.folio || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Disp: <span className="font-semibold text-foreground">{item.maxQuantity}</span>
                            </p>
                          </div>
                          {!isResolutionMode && (
                            <button 
                              onClick={() => onRemoveItem(item.originalIdx)}
                              className="absolute top-3 right-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-full transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 bg-background p-2 rounded-lg border border-border/50">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Baja:</span>
                          <Input 
                            type="number" 
                            min="0.1" 
                            max={item.maxQuantity}
                            step="0.1"
                            value={item.quantity}
                            onChange={e => onUpdateQuantity(item.originalIdx, Number(e.target.value))}
                            disabled={isResolutionMode}
                            className="h-10 text-right font-bold text-foreground flex-1 disabled:opacity-100 disabled:bg-muted"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-4 sm:pb-4">
          <div className="flex justify-between items-center px-5 py-3 border-b border-border/50 bg-secondary/10">
             <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Lotes</span>
              <span className="font-bold text-foreground text-base leading-tight">{items.length}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total a dar de baja</span>
              <span className="font-bold text-foreground text-xl leading-tight text-destructive">{totalSelectedQuantity.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex gap-3 p-4">
            {isResolutionMode ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onResolveRequest('REJECTED')} 
                  disabled={isSubmitting} 
                  className="flex-1 font-bold py-6 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  {isSubmitting ? 'Procesando...' : 'Rechazar'}
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => onResolveRequest('APPROVED')} 
                  disabled={isSubmitting}
                  className="flex-[1.5] font-bold py-6 rounded-xl shadow-md bg-warning hover:bg-warning/90 text-warning-foreground"
                >
                  {isSubmitting ? 'Procesando...' : 'Aprobar Baja'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={isRequestMode ? onCreateRequest : onDirectDispose} 
                  disabled={isSubmitting || items.length === 0 || !tipoBajaId}
                  className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
                >
                  {isSubmitting ? 'Procesando...' : isRequestMode ? 'Solicitar Baja' : 'Dar de Baja'}
                </Button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
