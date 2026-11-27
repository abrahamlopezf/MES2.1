'use strict';

/**
 * Split a physical quantity as evenly as the persisted decimal precision allows.
 * Any indivisible decimal units are distributed one at a time from the first
 * container. The resulting scaled integers conserve the rounded source total.
 */
const splitQuantityEqually = (total, count, precision = 3) => {
  const quantity = Number(total);
  const containers = Number(count);
  const decimalPlaces = Number(precision);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new TypeError('total must be a finite positive number');
  }
  if (!Number.isInteger(containers) || containers < 1) {
    throw new TypeError('count must be a positive integer');
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 9) {
    throw new TypeError('precision must be an integer between 0 and 9');
  }

  const scale = 10 ** decimalPlaces;
  const totalUnits = Math.round(quantity * scale);
  const baseUnits = Math.floor(totalUnits / containers);
  const remainderUnits = totalUnits - (baseUnits * containers);

  return Array.from({ length: containers }, (_, index) => (
    (baseUnits + (index < remainderUnits ? 1 : 0)) / scale
  ));
};

module.exports = { splitQuantityEqually };
