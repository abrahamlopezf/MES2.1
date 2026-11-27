'use strict';

const EPSILON = 0.0005;

/**
 * Legacy lots without invoice presentation metadata must be consumed before
 * newly received packaged lots. Keep the existing FIFO order inside each tier.
 */
const prioritizeLegacyLots = (lots = []) => [
  ...lots.filter((lot) => !(Number(lot.presentation_quantity) > EPSILON)),
  ...lots.filter((lot) => Number(lot.presentation_quantity) > EPSILON),
];

/**
 * Plan a FIFO withdrawal without splitting any package recorded on an invoice.
 * Lots without package metadata remain eligible for exact-quantity withdrawals.
 */
const planFifoPackageAllocations = (lots, requestedQuantity) => {
  let pending = Number(requestedQuantity);
  if (!Number.isFinite(pending) || pending <= 0) {
    return { allocations: [], requested_quantity: 0, allocated_quantity: 0, pending_quantity: 0 };
  }

  const allocations = [];
  for (const lot of prioritizeLegacyLots(lots)) {
    if (pending <= EPSILON) break;
    const available = Math.max(0, Number(lot.available_amount) || 0);
    const presentation = Number(lot.presentation_quantity) || 0;
    if (available <= EPSILON) continue;

    let quantity = 0;
    if (presentation > EPSILON) {
      const availablePackages = Math.floor((available + EPSILON) / presentation);
      if (availablePackages < 1) break;
      const packagesNeeded = Math.ceil((pending - EPSILON) / presentation);
      quantity = Math.min(availablePackages, packagesNeeded) * presentation;
    } else {
      quantity = Math.min(pending, available);
    }

    quantity = Number(quantity.toFixed(3));
    if (quantity <= EPSILON) continue;
    allocations.push({ lot, quantity });
    pending = Number(Math.max(0, pending - quantity).toFixed(3));
    const unpackageableRemainder = presentation > EPSILON
      && available - quantity > EPSILON
      && Math.floor((available - quantity + EPSILON) / presentation) * presentation < available - quantity - EPSILON;
    if (pending > EPSILON && unpackageableRemainder) break;
  }

  const allocatedQuantity = Number(allocations.reduce((sum, row) => sum + row.quantity, 0).toFixed(3));
  return {
    allocations,
    requested_quantity: Number(Number(requestedQuantity).toFixed(3)),
    allocated_quantity: allocatedQuantity,
    pending_quantity: pending <= EPSILON ? 0 : pending,
  };
};

const getWholePackageAvailable = (lots) => {
  let total = 0;
  for (const lot of prioritizeLegacyLots(lots)) {
    const available = Math.max(0, Number(lot.available_amount) || 0);
    const presentation = Number(lot.presentation_quantity) || 0;
    if (presentation <= EPSILON) {
      total += available;
      continue;
    }
    const completeQuantity = Math.floor((available + EPSILON) / presentation) * presentation;
    total += completeQuantity;
    if (available - completeQuantity > EPSILON) break;
  }
  return Number(total.toFixed(3));
};

module.exports = { planFifoPackageAllocations, getWholePackageAvailable, prioritizeLegacyLots, EPSILON };
