import { PrintJob } from '../../domain/entities/PrintJob';
import { PrintJobRepository } from '../../domain/repositories/PrintJobRepository';

export class InMemoryPrintJobRepository implements PrintJobRepository {
  private jobs: Map<string, PrintJob> = new Map();

  async findByIdempotencyKey(key: string): Promise<PrintJob | null> {
    for (const job of this.jobs.values()) {
      if (job.idempotencyKey === key) return job;
    }
    return null;
  }

  async save(job: PrintJob): Promise<void> {
    this.jobs.set(job.id, job);
  }
}
