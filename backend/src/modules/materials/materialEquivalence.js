'use strict';

const { Op } = require('sequelize');
const { Material } = require('../../database/models');

const normalizeMaterialIdentityName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('es-MX');

// Keep equivalence conservative: exact normalized name, same family and same
// base unit. Codes/location never define material identity.
const getActiveEquivalentMaterialIdsByName = async (material, transaction = null) => {
  const materialId = Number(material?.id);
  const familyId = Number(material?.family_id);
  const name = normalizeMaterialIdentityName(material?.name);
  if (!Number.isInteger(materialId) || materialId <= 0) return [];
  if (!Number.isInteger(familyId) || familyId <= 0 || !name) return [materialId];

  const candidates = await Material.findAll({
    where: {
      family_id: familyId,
      base_unit_id: material.base_unit_id == null ? { [Op.is]: null } : Number(material.base_unit_id),
      is_active: true,
    },
    attributes: ['id', 'name'],
    transaction,
  });
  return [...new Set(candidates
    .filter((candidate) => normalizeMaterialIdentityName(candidate.name) === name)
    .map((candidate) => Number(candidate.id))
    .concat(materialId))];
};

module.exports = { normalizeMaterialIdentityName, getActiveEquivalentMaterialIdsByName };
