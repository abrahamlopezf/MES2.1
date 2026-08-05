import React, { useState, useEffect } from 'react';
import { WarehouseWorkspace } from './WarehouseWorkspace';
import { apiClient } from '../../core/api/apiClient';
import { EventBus } from '../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../core/platform/EventBus/DomainEvents';

/**
 * WarehouseProvider
 * HOC que conecta el Workspace purista de Inventario con el backend (MES 3.0)
 * utilizando CQRS. Nunca edita, solo orquesta consultas asíncronas.
 */
export const WarehouseProvider = () => {
  const [loading, setLoading] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  
  // States para alimentar la UI inmutable
  const [qrData, setQrData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Escuchar el escáner del hardware
  useEffect(() => {
    const onScannerRead = (event) => {
      const qrCode = event.payload?.barcode;
      if (qrCode) {
        setIsScannerActive(false);
        handleSearch(qrCode);
      }
    };

    EventBus.on(MES_EVENTS.SCANNER_READ, onScannerRead);
    return () => EventBus.off(MES_EVENTS.SCANNER_READ, onScannerRead);
  }, []);

  const handleSearch = async (qrCode) => {
    setLoading(true);
    setQrData(null);
    setInventoryData(null);
    setHistoryData([]);

    try {
      // CQRS: Consulta 1 - Obtener info de identidad del QR
      const qrResponse = await apiClient.get(`/qrcodes/lookup/${qrCode}`);
      const qr = qrResponse.data?.data;
      
      if (!qr) {
        throw new Error('QR No encontrado');
      }

      setQrData({
        code: qr.qr_code,
        status: qr.status,
        purpose: qr.purpose,
        activated_at: qr.activated_at
      });

      // Si el QR está activo, simulamos (o le pegamos real si existe) 
      // la llamada al inventario actual
      if (qr.status === 'ACTIVE' || qr.status === 'CONSUMED') {
        // En una app completa sería un llamado real a /api/inventory/qr/:qrCode
        setInventoryData({
          materialName: qr.material_name || "Polipropileno Random (PP-001)",
          quantity: 1000,
          unit: 'KG',
          location: 'Rack A-01 (Almacén General)'
        });

        // CQRS: Consulta 2 - Historial inmutable
        // En una app completa: /api/traceability/qr/:qrCode
        setHistoryData([
          { type: 'GENERATED', timestamp: new Date(Date.now() - 86400000).toISOString(), notes: 'Lote creado por Admin' },
          { type: 'PRINTED', timestamp: new Date(Date.now() - 80000000).toISOString(), notes: 'Impreso en Zebra ZT411' },
          { type: 'RECEPTION', timestamp: new Date(Date.now() - 40000000).toISOString(), notes: 'Material ingresado por Juan Pérez' }
        ]);
      } else {
        // Si no está activo (ej. AVAILABLE), no hay inventario físico aún
        setHistoryData([
          { type: 'GENERATED', timestamp: new Date(Date.now() - 86400000).toISOString(), notes: 'Lote creado por Admin' },
          { type: 'PRINTED', timestamp: new Date(Date.now() - 80000000).toISOString(), notes: 'Impreso en Zebra ZT411' },
          { type: 'AVAILABLE', timestamp: new Date(Date.now() - 80000000).toISOString(), notes: 'Listo para ser recepcionado' }
        ]);
      }

    } catch (err) {
      console.error('Error al buscar QR:', err);
      alert('Error: Código QR no encontrado o inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WarehouseWorkspace 
      loading={loading}
      qrData={qrData}
      inventoryData={inventoryData}
      historyData={historyData}
      onSearch={handleSearch}
      isScannerActive={isScannerActive}
      onScannerToggle={setIsScannerActive}
    />
  );
};
