class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class BaseCatalogService {
  /**
   * @param {Object} model - Modelo de Sequelize
   * @param {String} resourceName - Nombre del recurso para mensajes de error
   */
  constructor(model, resourceName = 'Recurso') {
    this.model = model;
    this.resourceName = resourceName;
  }

  async list(options = {}) {
    const { page = 1, pageSize = 20, search, status, include_inactive } = options;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const where = {};
    
    // Soporte para API antigua (include_inactive) o nueva (status)
    if (status !== undefined) {
      where.is_active = status === 'ACTIVE';
    } else if (include_inactive !== 'true' && include_inactive !== true) {
      // Si no se envía status ni include_inactive=true, por defecto solo activos
      where.is_active = true;
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      data: rows,
      meta: {
        page: parseInt(page, 10),
        pageSize: limit,
        total: count
      }
    };
  }

  async findByUuid(uuid) {
    const record = await this.model.findOne({ where: { uuid } });
    if (!record) {
      throw new NotFoundError(`${this.resourceName} no encontrado.`);
    }
    return record;
  }

  async create(data) {
    // Las validaciones estrictas (ej. formato del body) ocurren en Zod (Router)
    // Las validaciones de DB (unique) saltarán aquí y las atrapa el errorHandler
    return await this.model.create(data);
  }

  async update(uuid, data) {
    const record = await this.findByUuid(uuid);
    
    // Regla de Negocio Base: Jamás permitimos modificar el 'code' original vía API en catálogos satélites.
    // Si se envía, lo ignoramos o lanzamos error. Por seguridad lo eliminamos del payload.
    if (data.code && data.code !== record.code) {
      const err = new Error('El código de un catálogo no puede ser modificado una vez creado.');
      err.name = 'BusinessRuleError';
      err.code = 'IMMUTABLE_FIELD';
      throw err;
    }

    return await record.update(data);
  }

  // Soft Delete
  async delete(uuid) {
    const record = await this.findByUuid(uuid);
    // Podríamos usar destroy() si el modelo tiene paranoia: true, pero controlaremos explícitamente is_active = false
    record.is_active = false;
    record.deleted_at = new Date();
    await record.save();
    return { success: true, message: `${this.resourceName} eliminado lógicamente.` };
  }

  // Restore
  async restore(uuid) {
    // findByUuid buscaría incluso inactivos (porque Sequelize omitirá deleted_at si no está bien configurado el paranoia, 
    // pero si paranoia: true está activo, findOne normal no lo encuentra. 
    // Así que forzamos { paranoid: false }
    const record = await this.model.findOne({ where: { uuid }, paranoid: false });
    if (!record) {
      throw new NotFoundError(`${this.resourceName} no encontrado.`);
    }

    record.is_active = true;
    record.deleted_at = null; // Revertir soft delete manual
    await record.save();
    // Si se está usando el paranoid nativo de Sequelize, se puede usar record.restore() en su lugar.
    // En la Fase 1 establecimos: { paranoid: true } en Material, pero los catálogos también? 
    // Sequelize `paranoid: true` añade comportamiento automático. Usaremos restore() nativo por seguridad, 
    // y si falla, fallback a manual.
    if (typeof record.restore === 'function') {
      await record.restore();
    }
    return { success: true, message: `${this.resourceName} restaurado.` };
  }
}

module.exports = { BaseCatalogService, NotFoundError };
