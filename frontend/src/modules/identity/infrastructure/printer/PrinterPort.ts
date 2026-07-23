export interface PrintPayload {
  jobId: string;
  templateFormat: string;
  renderedContent: string;
  quantity: number;
}

export interface PrintResult {
  success: boolean;
  message?: string;
  printerAssigned?: string;
}

/**
 * Puerto de Infraestructura para conectar impresoras.
 * El dominio ignora la implementación (Zebra, PDF, Mock).
 */
export interface PrinterPort {
  print(payload: PrintPayload): Promise<PrintResult>;
}
