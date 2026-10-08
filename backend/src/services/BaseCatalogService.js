const { Op } = require('sequelize');

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
    const parsedPageSize = pageSize === 'all' ? 10000 : parseInt(pageSize, 10);
    const limit = parsedPageSize;
    const offset = (page - 1) * parsedPageSize;

    const where = {};
    
    // Soporte para API antigua (include_inactive) o nueva (status)
    if (status !== undefined) {
      where.is_active = status === 'ACTIVE';
    } else if (include_inactive !== 'true' && include_inactive !== true) {
      // Si no se envía status ni include_inactive=true, por defecto solo activos
      where.is_active = true;
    }

    const modelAttributes = this.model.getAttributes ? Object.keys(this.model.getAttributes()) : [];
    const defaultOrder = modelAttributes.includes('name') ? [['name', 'ASC']] : [['created_at', 'DESC']];

    if (search && search.trim() !== '') {
      const searchConditions = [];
      const searchTerm = `%${search.trim()}%`;
      if (modelAttributes.includes('code')) {
        searchConditions.push({ code: { [Op.iLike]: searchTerm } });
      }
      if (modelAttributes.includes('name')) {
        searchConditions.push({ name: { [Op.iLike]: searchTerm } });
      }
      if (modelAttributes.includes('description')) {
        searchConditions.push({ description: { [Op.iLike]: searchTerm } });
      }
      
      if (searchConditions.length > 0) {
        where[Op.or] = searchConditions;
      }
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: defaultOrder
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

  async delete(uuid, options = {}) {
    const record = await this.findByUuid(uuid);
    const { action = 'deactivate', reason = 'Sin justificación', user } = options;

    const db = require('../database/models'); // require here to avoid circular dep

    if (action === 'delete') {
      if (typeof record.destroy === 'function') {
        await record.destroy();
      } else {
        record.deleted_at = new Date();
        record.is_active = false;
        await record.save();
      }
    } else {
      record.is_active = false;
      await record.save();
    }

    if (db.AuditLog && user) {
      await db.AuditLog.create({
        user_id: user.id,
        action_type: action === 'delete' ? 'SOFT_DELETE' : 'DEACTIVATE',
        table_name: this.model.tableName || this.model.name,
        record_id: record.id,
        details: { reason, uuid, code: record.code, name: record.name }
      });
    }

    return { success: true, message: `${this.resourceName} ${action === 'delete' ? 'eliminado' : 'desactivado'} lógicamente.` };
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
