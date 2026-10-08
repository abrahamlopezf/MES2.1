const { Tag } = require('../../../database/models');
const { throwHttpError } = require('../../../shared/security/accessRules');

const getAllTags = async () => {
  return await Tag.findAll({ order: [['name', 'ASC']] });
};

const getActiveTags = async () => {
  return await Tag.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
};

const getTagById = async (uuid) => {
  const tag = await Tag.findOne({ where: { uuid } });
  if (!tag) {
    throwHttpError('Etiqueta no encontrada', 404);
  }
  return tag;
};

const createTag = async (data, currentUser) => {
  const existing = await Tag.findOne({ where: { name: data.name } });
  if (existing) {
    throwHttpError('Ya existe una etiqueta con ese nombre', 400);
  }

  return await Tag.create({
    ...data,
    created_by: currentUser.id
  });
};

const updateTag = async (uuid, data, currentUser) => {
  const tag = await getTagById(uuid);

  if (data.name && data.name !== tag.name) {
    const existing = await Tag.findOne({ where: { name: data.name } });
    if (existing) {
      throwHttpError('Ya existe otra etiqueta con ese nombre', 400);
    }
  }

  await tag.update({
    ...data,
    updated_by: currentUser.id
  });

  return tag;
};

const deleteTag = async (uuid, currentUser) => {
  const tag = await getTagById(uuid);
  await tag.update({ deleted_by: currentUser.id });
  await tag.destroy();
  return { message: 'Etiqueta eliminada correctamente' };
};

module.exports = {
  getAllTags,
  getActiveTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag
};
