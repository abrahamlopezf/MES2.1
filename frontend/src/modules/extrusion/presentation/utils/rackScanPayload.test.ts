import { describe, expect, it } from 'vitest';
import { buildRackScanPayload } from './rackScanPayload';

describe('buildRackScanPayload', () => {
  it('sends the QR of the rack explicitly selected by the operator', () => {
    const payload = buildRackScanPayload({ pti_material_id: 23, quantity: 1 }, ' ext-mez-000000621 ');

    expect(payload).toEqual({ pti_material_id: 23, quantity: 1, rack_qr: 'EXT-MEZ-000000621' });
  });

  it('keeps automatic rack allocation when no rack QR was selected', () => {
    const payload = buildRackScanPayload({ pti_material_id: 23, quantity: 1 }, '   ');

    expect(payload).toEqual({ pti_material_id: 23, quantity: 1 });
  });
});
