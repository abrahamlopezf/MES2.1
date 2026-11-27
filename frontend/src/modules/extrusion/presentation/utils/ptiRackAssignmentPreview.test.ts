import { describe, expect, it } from 'vitest';
import { buildPtiRackAssignmentPreview } from './ptiRackAssignmentPreview';

const rack = (overrides: Record<string, unknown>) => ({
  id: 1,
  rack_code: 'RACK-PTI-0125',
  current_quantity: 0,
  max_capacity: 100,
  current_pti_product_id: null,
  destination_route: null,
  destination_subarea_id: null,
  custody_shift_session_id: null,
  available_for_active_shift: true,
  locked_until_shift_close: false,
  ...overrides,
});

describe('buildPtiRackAssignmentPreview', () => {
  it('prioritizes the rack explicitly selected by the operator', () => {
    const fallback = rack({ id: 125, rack_code: 'RACK-PTI-0125' });
    const selected = rack({ id: 175, rack_code: 'RACK-EXT-621' });

    const preview = buildPtiRackAssignmentPreview({
      racks: [fallback, selected],
      ptiProductId: 23,
      expectedRoute: 'TELARES_ROLLO',
      pieces: 1,
      selectedRackId: 175,
    });

    expect(preview.allocations).toEqual([{ rack: selected, pieces: 1 }]);
    expect(preview.remaining).toBe(0);
  });

  it('does not suggest another rack when the selected rack is unavailable', () => {
    const fallback = rack({ id: 125, rack_code: 'RACK-PTI-0125' });
    const locked = rack({ id: 175, rack_code: 'RACK-EXT-621', available_for_active_shift: false, locked_until_shift_close: true });

    const preview = buildPtiRackAssignmentPreview({
      racks: [fallback, locked],
      ptiProductId: 23,
      expectedRoute: 'TELARES_ROLLO',
      pieces: 1,
      selectedRackId: 175,
    });

    expect(preview.allocations).toEqual([]);
    expect(preview.remaining).toBe(1);
  });
});
