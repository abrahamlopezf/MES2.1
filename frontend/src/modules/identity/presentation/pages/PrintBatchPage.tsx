import { Navigate } from 'react-router-dom';

/**
 * The legacy screen dispatched jobs to an in-memory mock printer.
 * Thermal printing now runs through the authorized, persisted QR batch flow.
 */
export function PrintBatchPage() {
  return <Navigate to="/identity/generate" replace />;
}
