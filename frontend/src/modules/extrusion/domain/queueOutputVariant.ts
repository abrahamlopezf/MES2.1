import type { ExtruderQueue } from '../types/extrusion.types';

/** Groups containers only when both their recipe and captured output PTI match. */
export const getQueueOutputVariantKey = (queue: ExtruderQueue | null | undefined): string => {
  if (!queue || typeof queue !== 'object') return 'unknown:pti:legacy';
  const formulaId = Number(queue.formula_id ?? queue.formula?.id ?? 0);
  const ptiId = Number(queue.output_pti_product_id || queue.formula?.ptiProducts?.[0]?.id || 0);
  return `${formulaId}:pti:${ptiId || 'legacy'}`;
};
