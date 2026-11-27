'use strict';

const { Material } = require('../../database/models');

const normalizeMaterialIdentityName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('es-MX');

// The customer defines material identity by its normalized name. Catalog
// family, code, location and inconsistent unit-row IDs do not split stock.
const getActiveEquivalentMaterialIdsByName = async (material, transaction = null) => {
  const materialId = Number(material?.id);
  const name = normalizeMaterialIdentityName(material?.name);
  if (!Number.isInteger(materialId) || materialId <= 0) return [];
  if (!name) return [materialId];

  const candidates = await Material.findAll({
    where: { is_active: true },
    attributes: ['id', 'name'],
    transaction,
  });
  return [...new Set(candidates
    .filter((candidate) => normalizeMaterialIdentityName(candidate.name) === name)
    .map((candidate) => Number(candidate.id))
    .concat(materialId))];
};

module.exports = { normalizeMaterialIdentityName, getActiveEquivalentMaterialIdsByName };
