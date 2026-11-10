'use strict';

const EPSILON_KG = 0.0005;

/**
 * Plans an immutable FIFO draw against receipt lots ordered by their persisted
 * receipt timestamp, then invoice date/id for receipts arriving together. It
 * does not write; the caller locks and saves the rows
 * in the same transaction as the silo and inventory movements.
 */
function planFifoConsumption(requiredKg, lots) {
  const requested = Number(requiredKg);
  if (!Number.isFinite(requested) || requested < 0) {
    throw Object.assign(new Error('La cantidad solicitada al FIFO del silo no es válida.'), { statusCode: 400 });
  }
  if (!Array.isArray(lots)) {
    throw Object.assign(new Error('No se pudo leer el FIFO de facturas del silo.'), { statusCode: 409 });
  }

  const available = lots.reduce((sum, lot) => sum + Math.max(0, Number(lot.remaining_quantity_kg) || 0), 0);
  if (available + EPSILON_KG < requested) {
    throw Object.assign(new Error(`Saldo FIFO no conciliado: se requieren ${requested.toFixed(3)} kg y las facturas disponibles suman ${available.toFixed(3)} kg.`), { statusCode: 409 });
  }

  let pending = requested;
  const allocations = [];
  for (const lot of lots) {
    if (pending <= EPSILON_KG) break;
    const beforeKg = Number(lot.remaining_quantity_kg) || 0;
    const quantityKg = Number(Math.min(beforeKg, pending).toFixed(3));
    if (quantityKg <= 0) continue;
    const afterKg = Number(Math.max(0, beforeKg - quantityKg).toFixed(3));
    allocations.push({ lot, quantityKg, balanceBeforeKg: beforeKg, balanceAfterKg: afterKg });
    pending = Number(Math.max(0, pending - quantityKg).toFixed(3));
  }
  if (pending > EPSILON_KG) {
    throw Object.assign(new Error(`No fue posible cubrir ${pending.toFixed(3)} kg con las capas FIFO disponibles.`), { statusCode: 409 });
  }
  return allocations;
}

module.exports = { EPSILON_KG, planFifoConsumption };
