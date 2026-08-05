import React, { useState } from 'react';
import { DataCard } from '../../design-system/components/card/DataCard';
import { StatusChip } from '../../design-system/components/chip/StatusChip';
import { Input } from '../../design-system/components/input/Input';
import { tokens } from '../../design-system/foundation/tokens';
import { CameraScanner } from '../../design-system/components/scanner-overlay/CameraScanner';
import { QrCode } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: tokens.semantic.color.background, position: 'relative' }}>
      
      {/* Real Camera Scanner (Solo se monta si está activo) */}
      {isScannerActive && (
        <CameraScanner 
          onScan={handleScan}
          onClose={() => onScannerToggle(false)}
        />
      )}

      {/* Header Fijo */}
      <header style={{ padding: tokens.primitive.spacing['16'], borderBottom: `1px solid ${tokens.semantic.color.borderDefault}`, display: 'flex', alignItems: 'center', gap: tokens.primitive.spacing['16'] }}>
        <h1 style={{ fontSize: tokens.primitive.typography.sizes.lg, margin: 0, color: tokens.semantic.color.textHighEmphasis }}>Inventario (MES 3.0)</h1>
      </header>

      {/* Area de Busqueda (Buscador manual opcional) */}
      <div style={{ padding: tokens.primitive.spacing['16'], backgroundColor: tokens.primitive.colors.zinc900, display: 'flex', gap: tokens.primitive.spacing['12'] }}>
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: tokens.primitive.spacing['12'] }}>
          <div style={{ flex: 1 }}>
            <Input 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Escanear QR o introducir Lote..."
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              backgroundColor: tokens.semantic.color.primary, 
              color: tokens.primitive.colors.zinc50, 
              border: 'none', 
              padding: `0 ${tokens.primitive.spacing['24']}`, 
              borderRadius: tokens.primitive.spacing['8'], 
              cursor: 'pointer',
              fontWeight: 600,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      <main style={{ flex: 1, overflowY: 'auto', padding: tokens.primitive.spacing['16'], paddingBottom: '100px' }}>
        {!qrData && !loading && (
          <div style={{ textAlign: 'center', marginTop: '100px', color: tokens.semantic.color.textMediumEmphasis }}>
            <h2>No hay QR seleccionado</h2>
            <p>Utilice el botón flotante del escáner para consultar la trazabilidad física de un material.</p>
          </div>
        )}

        {qrData && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: tokens.primitive.spacing['24'] }}>
            
            {/* Detalle Principal Inmutable */}
            <DataCard 
              title={inventoryData?.materialName || 'Material Desconocido'}
              subtitle={`QR: ${qrData.code}`}
              status={qrData.status}
              headerRight={<StatusChip status={qrData.status} />}
              data={{
                'Propósito QR': qrData.purpose,
                'Cantidad Física': `${inventoryData?.quantity || 0} ${inventoryData?.unit || 'KG'}`,
                'Ubicación (Rack)': inventoryData?.location || 'No asignada',
                'Fecha de Activación': qrData.activated_at ? new Date(qrData.activated_at).toLocaleString() : 'N/A'
              }}
            />

            {/* Línea de Tiempo (Historial inmutable) */}
            <div>
              <h3 style={{ color: tokens.semantic.color.textHighEmphasis, marginBottom: tokens.primitive.spacing['16'] }}>Historial y Trazabilidad</h3>
              {historyData && historyData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {historyData.map((event, idx) => (
                    <div key={idx} style={{ padding: '16px', backgroundColor: tokens.primitive.colors.zinc800, borderRadius: '8px', borderLeft: `4px solid ${tokens.semantic.color.primary}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ color: tokens.semantic.color.textHighEmphasis }}>{event.type}</strong>
                        <span style={{ color: tokens.semantic.color.textMediumEmphasis, fontSize: '12px' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: tokens.semantic.color.textMediumEmphasis, fontSize: '14px' }}>
                        {event.notes || event.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: tokens.semantic.color.textMediumEmphasis }}>No hay eventos registrados para este QR.</p>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Botón Flotante para Escanear (Mobile First) */}
      <button
        onClick={() => onScannerToggle(true)}
        style={{
          position: 'fixed',
          bottom: '100px', // por encima del BottomNavigation de la app
          right: tokens.primitive.spacing['24'],
          width: '64px',
          height: '64px',
          borderRadius: '32px',
          backgroundColor: tokens.semantic.color.primary,
          color: tokens.primitive.colors.zinc50,
          border: 'none',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 40
        }}
      >
        <QrCode size={32} />
      </button>

    </div>
  );
};
