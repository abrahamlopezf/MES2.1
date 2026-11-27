export function buildRackScanPayload<T extends Record<string, unknown>>(payload: T, rackQr: string) {
  const selectedQr = String(rackQr || '').trim().toUpperCase();
  return selectedQr ? { ...payload, rack_qr: selectedQr } : payload;
}
