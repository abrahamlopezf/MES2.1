import { PrintJob } from '../entities/PrintJob';

export interface PrintJobRepository {
  /**
   * Busca un PrintJob basado en su idempotencyKey.
   * Útil para prevenir impresiones duplicadas.
   */
  findByIdempotencyKey(key: string): Promise<PrintJob | null>;
  
  /**
   * Guarda o actualiza un PrintJob.
   */
  save(job: PrintJob): Promise<void>;
}
