import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceptionWorkspace } from './ReceptionWorkspace';
import { createWorkflow } from '../../core/runtime/WorkflowEngine/createWorkflow';
import { ReceptionWorkflow as ReceptionFSM } from './ReceptionWorkflow';
import { EventBus } from '../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../core/platform/EventBus/DomainEvents';
import { apiClient } from '../../core/api/apiClient';

/**
 * ReceptionProvider (Runtime Integration)
 * Este HOC es el verdadero "Runtime" para este módulo.
 * Conecta la Máquina de Estados, el Frontend, los Comandos y el Backend.
 */
export const ReceptionProvider = () => {
  const navigate = useNavigate();
  // 1. Instanciar la Máquina de Estados (aislada de React)
  const workflow = useMemo(() => createWorkflow(ReceptionFSM), []);
  
  const [workflowState, setWorkflowState] = useState(workflow.getState());
  const [receptionData, setReceptionData] = useState(null);

  // 2. Suscribirse a cambios de estado de la FSM
  useEffect(() => {
    const unsubscribe = workflow.subscribe((newState) => {
      setWorkflowState(newState);
    });
    return unsubscribe;
  }, [workflow]);

  // 3. Manejar despacho de transiciones locales (cancelar, restart)
  const handleDispatch = (action) => {
    try {
      workflow.dispatch(action);
    } catch (err) {
      console.warn(`[ReceptionProvider] Transición inválida: ${action}`);
    }
  };

  // 4. Manejar "Commands" (Negocio)
  const handleCommand = async (command) => {
    if (command.type === 'RESOLVE_QR_COMMAND') {
      const { qrCode } = command.payload;
      const start = performance.now();
      try {
        // Interacción real con Backend
        const response = await apiClient.get(`/qrcodes/lookup/${qrCode}`);
        const data = response.data.data;
        
        setReceptionData({
          qrCode: data.qr_code,
          materialId: data.material_id || 1, // En base real el lookup debe traer esto
          materialName: data.material_name || "Polipropileno (PP-001)",
          provider: data.provider || "SABIC",
          lote: data.lote || "L-001"
        });

        // Registrar SLA
        const duration = performance.now() - start;
        if (duration < 300) {
          EventBus.emit('SLA_OK', { metric: 'QR_RESOLUTION', duration });
        } else {
          EventBus.emit('SLA_FAILED', { metric: 'QR_RESOLUTION', duration });
        }

        workflow.dispatch('VALIDATE_OK');
      } catch (err) {
        console.error('Error resolviendo QR:', err);
        workflow.dispatch('INVALID');
      }
    }

    if (command.type === 'SUBMIT_RECEPTION_COMMAND') {
      const { materialId, quantity, rack, notes } = command.payload;
      const start = performance.now();
      try {
        await apiClient.post('/reception', {
          qr_code_value: receptionData.qrCode,
          material_id: materialId,
          location_id: 1, // Mock de Rack/Ubicación para este ejemplo
          unit_id: 1, // Mock de unidad
          quantity: Number(quantity),
          notes
        });

        const duration = performance.now() - start;
        if (duration < 150) {
           EventBus.emit('SLA_OK', { metric: 'TRANSITION_READY_SUCCESS', duration });
        } else {
           EventBus.emit('SLA_FAILED', { metric: 'TRANSITION_READY_SUCCESS', duration });
        }

        workflow.dispatch('DONE');
      } catch (err) {
        console.error('Error guardando recepción:', err);
        workflow.dispatch('FAIL');
      }
    }
  };

  // 5. Simular lectura de Scanner de hardware
  useEffect(() => {
    // Si estuviéramos en producción, aquí escucharíamos `ScannerAdapter.onScan`
    const onScannerData = (event) => {
      const qrCode = event.payload?.barcode;
      if (workflow.getState() === 'SCANNING' || workflow.getState() === 'INITIAL') {
         workflow.dispatch('QR_SCANNED');
         handleCommand({ type: 'RESOLVE_QR_COMMAND', payload: { qrCode } });
      }
    };
    const unsubscribe = EventBus.subscribe(MES_EVENTS.SCANNER_READ, onScannerData);
    return () => unsubscribe();
  }, [workflow]);

  // Renderizar la Vista Pura pasando los Callbacks y el Estado
  return (
    <ReceptionWorkspace 
      workflowState={workflowState}
      onDispatch={handleDispatch}
      onCommand={handleCommand}
      data={receptionData}
      onExit={() => navigate(-1)}
    />
  );
};
