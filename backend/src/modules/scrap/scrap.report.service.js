const { sequelize, ScrapContainer, ScrapMovement, ScrapCatalog, StorageRack, User } = require('../../database/models');
const { Op } = require('sequelize');

class ScrapReportService {
    async getReportData(filters = {}) {
        const { 
            fecha_inicio, 
            fecha_fin, 
            tipo_scrap, // scrap_catalog_id
            rack,       // rack_id
            estado,     // status
            usuario     // performed_by
        } = filters;

        // Where for Containers
        const containerWhere = { is_active: true };
        if (tipo_scrap) containerWhere.scrap_catalog_id = tipo_scrap;
        if (rack) containerWhere.rack_id = rack;
        if (estado) containerWhere.status = estado;

        // Where for Movements
        const movementWhere = {};
        if (fecha_inicio && fecha_fin) {
            movementWhere.created_at = { [Op.between]: [fecha_inicio, fecha_fin] };
        } else if (fecha_inicio) {
            movementWhere.created_at = { [Op.gte]: fecha_inicio };
        } else if (fecha_fin) {
            movementWhere.created_at = { [Op.lte]: fecha_fin };
        }
        
        if (usuario) movementWhere.performed_by = usuario;

        // 1. Obtener contenedores según filtros base
        const containers = await ScrapContainer.findAll({
            where: containerWhere,
            include: [
                { model: ScrapCatalog, as: 'scrap_type', attributes: ['name', 'code'] },
                { model: StorageRack, as: 'rack', attributes: ['name', 'code'] }
            ]
        });

        const containerIds = containers.map(c => c.id);

        // Si filtramos por contenedores (tipo_scrap, rack, estado), también aplicamos este filtro a los movimientos
        if (tipo_scrap || rack || estado) {
            movementWhere.container_id = { [Op.in]: containerIds };
        }

        // 2. Obtener detalle de movimientos con base a filtros de fecha, usuario y contenedor
        const detalle = await ScrapMovement.findAll({
            where: movementWhere,
            order: [['created_at', 'DESC']]
        });

        // 3. Totales
        let total_generated = 0;
        let total_transferred = 0;
        let total_recycled = 0;

        detalle.forEach(mov => {
            const qty = Number(mov.quantity);
            if (mov.movement_type === 'GENERACION') total_generated += qty;
            if (mov.movement_type === 'TRASLADO') total_transferred += qty; // Nota: El traslado suma absolutos o solo ingresos/salidas
            if (mov.movement_type === 'SALIDA_RECICLAJE') total_recycled += qty;
        });

        // 4. Resumen
        const total_containers = containers.length;
        const total_scrap = containers.reduce((sum, c) => sum + Number(c.current_quantity), 0);

        return {
            resumen: {
                total_containers,
                total_scrap_actual: total_scrap,
            },
            totales: {
                total_generated,
                total_transferred,
                total_recycled
            },
            detalle
        };
    }
}

module.exports = new ScrapReportService();
