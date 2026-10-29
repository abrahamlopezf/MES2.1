import { describe, expect, it } from 'vitest';
import { getQueueOutputVariantKey } from './queueOutputVariant';
import type { ExtruderQueue } from '../types/extrusion.types';

const queue = (overrides: Partial<ExtruderQueue> = {}) => ({
  id: 1,
  extruder_id: 2,
  consumption_order_qr_id: 'MIX-1',
  formula_id: 10,
  priority: 1,
  status: 'EN_ESPERA',
  ...overrides,
}) as ExtruderQueue;

describe('queue output PTI variants', () => {
  it('groups containers from the same formula and captured PTI', () => {
    expect(getQueueOutputVariantKey(queue({ id: 1, output_pti_product_id: 21 })))
      .toBe(getQueueOutputVariantKey(queue({ id: 2, output_pti_product_id: 21 })));
  });

  it('separates the same formula when its captured output PTI/color changes', () => {
    expect(getQueueOutputVariantKey(queue({ output_pti_product_id: 21, output_pti_color: 'Azul' })))
      .not.toBe(getQueueOutputVariantKey(queue({ output_pti_product_id: 22, output_pti_color: 'Rojo' })));
  });

  it('keeps legacy containers grouped by their formula when no PTI snapshot exists', () => {
    expect(getQueueOutputVariantKey(queue({ id: 1 }))).toBe(getQueueOutputVariantKey(queue({ id: 2 })));
  });
});
