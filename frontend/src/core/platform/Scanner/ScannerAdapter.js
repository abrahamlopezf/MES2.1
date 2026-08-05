/**
 * Scanner Adapter Interface
 * Abstrae el hardware real (Cámara, Pistola USB, Bluetooth, Zebra).
 */

class ScannerAdapter {
  constructor() {
    this.hardwareType = 'UNKNOWN';
  }

  // Interfaz esperada para cualquier adaptador
  async initialize() {
    throw new Error('initialize() debe ser implementado por el adaptador');
  }

  async scan() {
    throw new Error('scan() debe ser implementado por el adaptador');
  }

  stop() {
    throw new Error('stop() debe ser implementado por el adaptador');
  }
}

/**
 * Mock Adapter (Para desarrollo)
 */
export class MockScannerAdapter extends ScannerAdapter {
  constructor() {
    super();
    this.hardwareType = 'MOCK_KEYBOARD';
  }

  async initialize() {
    console.log('[Scanner] Inicializado Mock Scanner');
    return true;
  }

  async scan() {
    return new Promise((resolve) => {
      // Simulamos que tras 1 segundo lee un QR (En desarrollo se podría conectar a un input oculto)
      setTimeout(() => {
        resolve('ALM-QR-TEST-001');
      }, 1000);
    });
  }

  stop() {
    console.log('[Scanner] Detenido Mock Scanner');
  }
}

/**
 * Scanner Service
 * Usa el adaptador inyectado para realizar escaneos y emite eventos globales.
 */
import { EventBus } from '../EventBus/EventBus';
import { MES_EVENTS } from '../EventBus/DomainEvents';

export class ScannerService {
  constructor(adapter = new MockScannerAdapter()) {
    this.adapter = adapter;
  }

  setAdapter(newAdapter) {
    this.adapter = newAdapter;
  }

  async triggerScan() {
    try {
      await this.adapter.initialize();
      const code = await this.adapter.scan();
      
      // Emitimos el evento global para que Universal Search o Workspace Engine lo atrape
      EventBus.emit(MES_EVENTS.QR_SCANNED, { code, hardware: this.adapter.hardwareType });
      
      return code;
    } catch (error) {
      EventBus.emit(MES_EVENTS.SCANNER_ERROR, error);
      throw error;
    } finally {
      this.adapter.stop();
    }
  }
}

export const Scanner = new ScannerService();
