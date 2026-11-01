'use strict';

const normalizeColor = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/** A queue is part of an automatically advancing batch only when it came from
 * the same preparation and has the same frozen output product/color. */
const samePreparedQueueBatch = (left, right) => {
  const leftPreparationId = Number(left?.process_preparation_id ?? left?.preparation?.id ?? 0);
  const rightPreparationId = Number(right?.process_preparation_id ?? right?.preparation?.id ?? 0);
  if (!leftPreparationId || leftPreparationId !== rightPreparationId) return false;
  if (Number(left?.formula_id || 0) !== Number(right?.formula_id || 0)) return false;

  const leftProductId = Number(left?.output_pti_product_id || 0);
  const rightProductId = Number(right?.output_pti_product_id || 0);
  const leftColor = normalizeColor(left?.output_pti_color);
  const rightColor = normalizeColor(right?.output_pti_color);
  if (leftProductId || rightProductId) {
    if (leftProductId <= 0 || rightProductId <= 0 || leftProductId !== rightProductId) return false;
    return !leftColor || !rightColor || leftColor === rightColor;
  }
  return Boolean(leftColor && rightColor && leftColor === rightColor);
};

const selectNextQueueForBatch = (waitingQueues, completedQueue) =>
  (waitingQueues || []).find((candidate) => samePreparedQueueBatch(candidate, completedQueue)) || null;

module.exports = { normalizeColor, samePreparedQueueBatch, selectNextQueueForBatch };
