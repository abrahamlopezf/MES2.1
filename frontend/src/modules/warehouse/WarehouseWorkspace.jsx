import React, { useState } from 'react';
import { Search, QrCode, Package, Clock, Hash, Layers } from 'lucide-react';
import { CameraScanner } from '../../design-system/components/scanner-overlay/CameraScanner';
import { TFCard, TFButton, TFInput, TFBadge } from '../../components/tf-ui';

export const WarehouseWorkspace = ({ 
  qrData, 
  inventoryData, 
  historyData, 
  onSearch, 
  loading,
  isScannerActive,
  onScannerToggle
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  const handleScan = (code) => {
    onScannerToggle(false);
    onSearch(code);
  };

  return (
    <div className="flex flex-col h-full bg-background relative pb-24">
      {/* Real Camera Scanner (Solo se monta si está activo) */}
      {isScannerActive && (
        <CameraScanner 
          onScan={handleScan}
          onClose={() => onScannerToggle(false)}
        />
      )}

      {/* Header Fijo */}
      <header className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground m-0">Inventario</h1>
            <p className="text-sm text-muted-foreground m-0">Trazabilidad física de materiales</p>
          </div>
        </div>
      </header>

      {/* Area de Busqueda */}
      <div className="p-6 bg-background/50 border-b border-border">
        <form onSubmit={handleSearch} className="flex gap-3 max-w-3xl">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <TFInput 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Escanear QR o introducir Lote..."
              disabled={loading}
              className="w-full pl-10"
            />
          </div>
          <TFButton 
            type="submit" 
            variant="primary"
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </TFButton>
        </form>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {!qrData && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
              <QrCode className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2">No hay QR seleccionado</h2>
            <p className="text-muted-foreground">
              Utilice el botón flotante del escáner para consultar la trazabilidad física de un material o ingrese el lote manualmente en el buscador.
            </p>
          </div>
        )}

        {qrData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
            {/* Detalle Principal Inmutable */}
            <TFCard className="flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {inventoryData?.materialName || 'Material Desconocido'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="w-4 h-4" />
                    <span>{qrData.code}</span>
                  </div>
                </div>
                <TFBadge 
                  variant={qrData.status === 'ACTIVE' ? 'success' : qrData.status === 'INACTIVE' ? 'danger' : 'default'}
                >
                  {qrData.status || 'DESCONOCIDO'}
                </TFBadge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <span className="block text-sm text-muted-foreground mb-1">Propósito QR</span>
                  <span className="font-medium text-foreground">{qrData.purpose || 'N/A'}</span>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <span className="block text-sm text-muted-foreground mb-1">Cantidad Física</span>
                  <span className="font-medium text-foreground">
                    {inventoryData?.quantity || 0} {inventoryData?.unit || 'KG'}
                  </span>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <span className="block text-sm text-muted-foreground mb-1">Ubicación (Rack)</span>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Layers className="w-4 h-4 text-primary" />
                    {inventoryData?.location || 'No asignada'}
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <span className="block text-sm text-muted-foreground mb-1">Fecha Activación</span>
                  <span className="font-medium text-foreground">
                    {qrData.activated_at ? new Date(qrData.activated_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </TFCard>

            {/* Línea de Tiempo (Historial inmutable) */}
            <TFCard className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground m-0">Historial y Trazabilidad</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2">
                {historyData && historyData.length > 0 ? (
                  <div className="relative border-l border-muted ml-3 space-y-6">
                    {historyData.map((event, idx) => (
                      <div key={idx} className="relative pl-6">
                        {/* Dot */}
                        <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                        
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <strong className="text-foreground">{event.type}</strong>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground m-0">
                            {event.notes || event.description || 'Sin detalles registrados.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground m-0">No hay eventos registrados para este QR.</p>
                  </div>
                )}
              </div>
            </TFCard>
          </div>
        )}
      </main>

      {/* Botón Flotante para Escanear (Mobile First) */}
      <button
        onClick={() => onScannerToggle(true)}
        className="fixed bottom-[100px] right-6 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all z-40 border-none outline-none cursor-pointer"
        aria-label="Escanear QR"
      >
        <QrCode className="w-8 h-8" />
      </button>
    </div>
  );
};
