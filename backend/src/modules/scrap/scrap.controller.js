const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const { ScrapContainer, ScrapMovement, ScrapCatalog, StorageRack, sequelize } = require('../../database/models');
const { updateContainerInventory } = require('./services/updateContainerInventory.service');

const createContainer = async (req, res) => {
  try {
    const { code, name, container_type, capacity, unit, area_id } = req.body;
    const container = await ScrapContainer.create({
      code,
      name,
      container_type,
      capacity,
      unit,
      area_id,
      status: 'AVAILABLE',
      is_active: true,
    });
    return successResponse(res, 'Contenedor creado correctamente.', container, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al crear el contenedor.', [], 400);
  }
};

const listContainers = async (req, res) => {
  try {
    const { status, scrap_catalog_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (scrap_catalog_id) where.scrap_catalog_id = scrap_catalog_id;

    const containers = await ScrapContainer.findAll({
      where,
      include: [
        { model: ScrapCatalog, as: 'scrap_type', attributes: ['id', 'name', 'code'] },
        { model: StorageRack, as: 'rack', attributes: ['id', 'name', 'code'] }
      ],
      order: [['id', 'DESC']]
    });

    return successResponse(res, 'Contenedores de scrap listados correctamente.', containers, 200);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al obtener los contenedores.', [], 500);
  }
};

const getContainer = async (req, res) => {
  try {
    const { id } = req.params;

    const container = await ScrapContainer.findByPk(id, {
      include: [
        { model: ScrapCatalog, as: 'scrap_type', attributes: ['id', 'name', 'code'] },
        { model: StorageRack, as: 'rack', attributes: ['id', 'name', 'code'] },
        { 
          model: ScrapMovement, 
          as: 'movements', 
          required: false,
        }
      ],
      order: [[{ model: ScrapMovement, as: 'movements' }, 'id', 'DESC']]
    });

    if (!container) {
      return errorResponse(res, 'El contenedor no existe.', [], 404);
    }

    return successResponse(res, 'Detalle del contenedor obtenido correctamente.', container, 200);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al obtener detalle del contenedor.', [], 500);
  }
};

const createMovement = async (req, res) => {
  try {
    const { container_id, quantity, movement_type, process_run_id, traceable_item_id, notes, reference_folio } = req.body;
    const user_id = req.user.id;

    const container = await updateContainerInventory({
      container_id,
      quantity,
      movement_type,
      process_run_id,
      traceable_item_id,
      notes,
      reference_folio,
      performed_by: user_id
    });

    return successResponse(res, 'Movimiento registrado correctamente.', container, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al registrar el movimiento.', [], 400);
  }
};

const transfer = async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { origin_container_id, destination_container_id, quantity, notes } = req.body;
    const user_id = req.user.id;
    const reference_folio = `TRAN-${Date.now()}`;

    // 1 & 2. Restar origen
    await updateContainerInventory({
      container_id: origin_container_id,
      quantity: -quantity,
      movement_type: 'TRASLADO',
      reference_folio,
      notes: notes || 'Traslado parcial al contenedor destino',
      performed_by: user_id,
      transaction: trx
    });

    // 3 & 4. Incrementar destino
    await updateContainerInventory({
      container_id: destination_container_id,
      quantity: quantity,
      movement_type: 'TRASLADO',
      reference_folio,
      notes: notes || 'Recepción desde contenedor origen',
      performed_by: user_id,
      transaction: trx
    });

    await trx.commit();
    return successResponse(res, 'Transferencia realizada correctamente.', {}, 200);
  } catch (error) {
    await trx.rollback();
    return errorResponse(res, error.message || 'Error al realizar la transferencia.', [], 400);
  }
};

const recycle = async (req, res) => {
  try {
    const { container_id, quantity, reference_folio, notes } = req.body;
    const user_id = req.user.id;

    // Use negative quantity for SALIDA
    const container = await updateContainerInventory({
      container_id,
      quantity: -quantity,
      movement_type: 'SALIDA_RECICLAJE',
      reference_folio,
      notes: notes || 'Salida definitiva a reciclaje',
      performed_by: user_id
    });

    return successResponse(res, 'Salida a reciclaje registrada correctamente.', container, 200);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al registrar la salida a reciclaje.', [], 400);
  }
};

module.exports = {
  listContainers,
  getContainer,
  createContainer,
  createMovement,
  transfer,
  recycle
};
