'use strict';

function buildSiloReceiptMovementRows({ entries, inventoryId, userId, siloId, siloCode, auditLogId, unitCostFor }) {
  return (entries || []).map((entry, index) => {
    const quantity = Number(entry.quantity);
    const unitCost = Number(unitCostFor(entry));
    return {
      inventory_id: inventoryId,
      type: 'SILO_ENTRY',
      quantity_change: quantity,
      unit_cost: unitCost,
      total_cost: Number((quantity * unitCost).toFixed(4)),
      performed_by: userId,
      notes: `Recepción de PP en custodia de Almacén; factura ${entry.folio || 'S/R'}; silo ${siloCode || siloId}.`,
      silo_id: siloId,
      source_audit_log_id: auditLogId,
      source_reference: `${String(entry.folio || 'S-R').slice(0, 105)}#${index + 1}`,
    };
  });
}

module.exports = { buildSiloReceiptMovementRows };
