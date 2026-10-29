'use strict';

/**
 * Divide PP consumption as evenly as possible between the two active silos.
 * If one silo cannot supply its half, the other supplies the remainder when
 * its stock allows. No inventory is changed by this function.
 */
function allocateBalancedSiloConsumption(requiredKg, silos) {
  const required = Number(requiredKg);
  if (!Number.isFinite(required) || required < 0) {
    throw Object.assign(new Error('La cantidad de PP requerida no es válida.'), { statusCode: 400 });
  }
  if (!Array.isArray(silos) || silos.length !== 2) {
    throw Object.assign(new Error(`Se requieren exactamente 2 silos activos para repartir el PP. Silos activos: ${Array.isArray(silos) ? silos.length : 0}.`), { statusCode: 409 });
  }
  const stock = silos.map((silo) => Number(silo.current_stock_kg) || 0);
  const totalStock = stock[0] + stock[1];
  if (totalStock + 0.0005 < required) {
    throw Object.assign(new Error(`Stock total insuficiente en los silos: requiere ${required.toFixed(3)} kg; disponible ${totalStock.toFixed(3)} kg.`), { statusCode: 400 });
  }

  const firstHalf = Math.round((required / 2) * 1000) / 1000;
  let first = Math.min(firstHalf, stock[0]);
  let second = Number((required - first).toFixed(3));
  if (second > stock[1]) {
    second = stock[1];
    first = Number((required - second).toFixed(3));
  }
  if (first > stock[0] + 0.0005 || second > stock[1] + 0.0005) {
    throw Object.assign(new Error('No hay stock suficiente para repartir el PP entre ambos silos.'), { statusCode: 400 });
  }

  return silos.map((silo, index) => ({ silo, quantityKg: index === 0 ? first : second }));
}

module.exports = { allocateBalancedSiloConsumption };
