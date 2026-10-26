/** Extract the canonical traveler code from legacy IDs or structured roll-label QR payloads. */
function normalizeViajeroQr(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const payload = JSON.parse(raw);
    if (payload?.type === 'TRACEFLOW_TELARES_ROLL' && payload.version === 1) {
      return String(payload.qr_code || payload.roll_code || '').trim();
    }
  } catch (_) {
    // Legacy labels contain a plain QR identifier.
  }
  return raw;
}
module.exports = normalizeViajeroQr;
