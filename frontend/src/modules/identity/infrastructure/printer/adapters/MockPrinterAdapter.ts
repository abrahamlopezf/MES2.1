import { PrinterPort, PrintPayload, PrintResult } from '../PrinterPort';
import { Logger } from '@core/logging/Logger';

/**
 * Adaptador de Impresión Mock.
 * Simula tiempo de red y respuesta de una impresora real para entornos de desarrollo.
 */
export class MockPrinterAdapter implements PrinterPort {
  async print(payload: PrintPayload): Promise<PrintResult> {
    Logger.info(`[MockPrinter] Recibiendo Job ${payload.jobId} (${payload.quantity} etiquetas en formato ${payload.templateFormat})`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        Logger.info(`[MockPrinter] Job ${payload.jobId} completado exitosamente.`);
        resolve({
          success: true,
          message: 'Simulación de impresión completada',
          printerAssigned: 'MOCK-PRINTER-01'
        });
      }, 1500); // 1.5s delay simulando hardware
    });
  }
}
