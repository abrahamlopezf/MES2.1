'use strict';

function getLotBackedInventoryReconciliation(inventoryAmount, activeLotsAfterScan, scannedQuantity) {
  const currentAmount = Math.max(0, Number(inventoryAmount) || 0);
  const expectedBeforeScan = Math.max(0, Number(activeLotsAfterScan) || 0) + Math.max(0, Number(scannedQuantity) || 0);
  const delta = Math.max(0, expectedBeforeScan - currentAmount);
  return {
    expectedBeforeScan: Number(expectedBeforeScan.toFixed(3)),
    delta: Number(delta.toFixed(3)),
  };
}

module.exports = { getLotBackedInventoryReconciliation };
