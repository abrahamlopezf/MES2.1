'use strict';

const { Op } = require('sequelize');
const { Material, MaterialUnit } = require('../../database/models');

const normalizeMaterialIdentityName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('es-MX');

const normalizeUnitIdentity = (unit) => String(unit?.code || unit?.name || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('es-MX');

// Catalog family, code, location and duplicate unit-row IDs can differ. The
// identity rule is exact normalized material name; quantities are combined
// only when the unit code/name is equivalent.
const getActiveEquivalentMaterialIdsByName = async (material, transaction = null) => {
  const materialId = Number(material?.id);
  const name = normalizeMaterialIdentityName(material?.name);
  if (!Number.isInteger(materialId) || materialId <= 0) return [];
  if (!name) return [materialId];

  const sourceUnit = material?.base_unit || (material?.base_unit_id
    ? await MaterialUnit.findByPk(Number(material.base_unit_id), { attributes: ['id', 'code', 'name'], transaction })
    : null);
  const unitIdentity = normalizeUnitIdentity(sourceUnit);
  const candidateUnits = unitIdentity
    ? await MaterialUnit.findAll({ attributes: ['id', 'code', 'name'], transaction })
    : [];
  const equivalentUnitIds = candidateUnits
    .filter((unit) => normalizeUnitIdentity(unit) === unitIdentity)
    .map((unit) => Number(unit.id));
  const candidates = await Material.findAll({
    where: {
      base_unit_id: material.base_unit_id == null
        ? { [Op.is]: null }
        : { [Op.in]: equivalentUnitIds.length ? equivalentUnitIds : [Number(material.base_unit_id)] },
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
