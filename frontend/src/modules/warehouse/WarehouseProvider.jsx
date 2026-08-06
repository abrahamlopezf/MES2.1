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
    const onScannerRead = ({ code }) => {
      if (code) {
        setIsScannerActive(false);
        handleSearch(code);
      }
    };

    const unsubscribe = EventBus.subscribe(
      MES_EVENTS.QR_SCANNED,
      onScannerRead
    );

    return unsubscribe;
  }, []);

  const handleSearch = async (qrCode) => {
    setLoading(true);
    setQrData(null);
    setInventoryData(null);
    setHistoryData([]);

    try {
      // Si el código viene como URL completa (ej. al escanear un QR físico que tiene el link)
      let cleanQrCode = qrCode;
      try {
        if (cleanQrCode.includes('http')) {
          const urlObj = new URL(cleanQrCode);
          const tokenId = urlObj.searchParams.get('tokenId');
          if (tokenId) cleanQrCode = tokenId;
        }
      } catch(e) {}

      // CQRS: Consulta 1 - Obtener info de identidad del QR
      const qrResponse = await apiClient.get(`/qr/lookup/${cleanQrCode}`);
      
      // Manejar las múltiples formas en las que puede venir envuelta la respuesta en Axios/API
      const responseData = qrResponse.data || qrResponse;
      const resultData = responseData.data || responseData;
      const qr = resultData.qr || resultData;
      
      if (!qr) {
        throw new Error('QR No encontrado');
      }

      setQrData({
        code: qr.qr_code,
        status: qr.status,
        purpose: qr.purpose,
        activated_at: qr.activated_at
      });

      // Usar datos reales del backend
      if (resultData.inventory) {
        setInventoryData({
          materialName: resultData.inventory.material?.name || 'Material Desconocido',
          quantity: resultData.inventory.available_quantity,
          unit: resultData.inventory.unit?.code || 'PZA',
          location: resultData.inventory.location || 'Desconocida'
        });
      }

      if (resultData.events && resultData.events.length > 0) {
        const history = resultData.events.map(ev => ({
          type: ev.event_type,
          timestamp: ev.created_at,
          notes: ev.notes || 'Evento registrado'
        }));
        // Order descending for the UI
        setHistoryData(history.reverse());
      } else {
        setHistoryData([
          { type: 'GENERATED', timestamp: new Date(Date.now()).toISOString(), notes: 'Sin historial' }
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
