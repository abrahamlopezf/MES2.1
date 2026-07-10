const db = require('../../database/models');

const buildAreaResponse = (area) => {
  const plainArea = area.get({ plain: true });

  return {
    id: plainArea.id,
    name: plainArea.name,
    code: plainArea.code,
    description: plainArea.description,
    is_active: plainArea.is_active,
    created_at: plainArea.created_at,
    updated_at: plainArea.updated_at,
  };
};

const getAreas = async () => {
  const areas = await db.Area.findAll({
    order: [['id', 'ASC']],
  });

  return areas.map(buildAreaResponse);
};

const getAreaById = async (id) => {
  const area = await db.Area.findByPk(id);

  if (!area) {
    const error = new Error('El área solicitada no existe.');
    error.statusCode = 404;
    throw error;
  }

  return buildAreaResponse(area);
};

module.exports = {
  getAreas,
  getAreaById,
};