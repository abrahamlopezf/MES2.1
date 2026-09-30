import React from 'react';
import { Package, QrCode as QrCodeIcon, Calendar, Hash, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge } from '../../../../../design-system';

interface AreaItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
}

export function AreaItemDetailsModal({ isOpen, onClose, item }: AreaItemDetailsModalProps) {
  const navigate = useNavigate();
  if (!isOpen || !item) return null;

  const { material, lote, qr_code, amount, updated_at } = item;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <h2 className="text-xl font-bold text-foreground">Detalles del Material</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Material Summary */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex items-start gap-4">
            <div className="p-3 bg-background rounded-lg border border-border shrink-0">
              <Package size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg leading-tight">{material?.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-muted-foreground">{material?.internal_code}</span>
                {material?.ranking?.nomenclature && (
                  <Badge variant="secondary" className="text-[10px]">{material.ranking.nomenclature}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Cantidad Actual</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary">{Number(amount).toFixed(2)}</span>
                <span className="text-sm font-bold text-muted-foreground">{material?.base_unit?.code || 'Pza'}</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Costo Unitario</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-500">
                  {lote?.unit_cost ? `$${Number(lote.unit_cost).toFixed(2)}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Lote & QR Details */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Hash size={16} className="text-muted-foreground" />
                Trazabilidad Interna
              </h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hash size={16} /> Lote de Origen
                </span>
                <span className="text-sm font-mono font-bold">{lote?.folio || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <QrCodeIcon size={16} /> Código QR Asociado
                </span>
                <span className="text-sm font-mono font-bold text-primary">{qr_code?.qr_code || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar size={16} /> Fecha de Ingreso
                </span>
                <span className="text-sm font-medium">{new Date(updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3 bg-muted/20">
          <Button variant="outline" className="flex-1 font-bold" onClick={onClose}>
            Cerrar
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              onClose();
              if (qr_code?.qr_code) navigate(`/traceability/genealogy?tokenId=${qr_code.qr_code}`);
            }}
            disabled={!qr_code?.qr_code}
          >
            Ver Historial <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
