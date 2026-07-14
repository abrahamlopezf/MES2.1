const { sequelize, ScrapContainer, ScrapMovement, ScrapCatalog, StorageRack, User } = require('../../database/models');
const { Op } = require('sequelize');

class ScrapDashboardService {
    async getDashboardSummary() {
        // 1. Contenedores
        const total_containers = await ScrapContainer.count({ where: { is_active: true } });
        const containers_empty = await ScrapContainer.count({ where: { status: 'EMPTY', is_active: true } });
        const containers_available = await ScrapContainer.count({ where: { status: 'AVAILABLE', is_active: true } });
        const containers_full = await ScrapContainer.count({ where: { status: 'FULL', is_active: true } });
        
        // Sumar todo el scrap actual en contenedores activos
        const total_scrap_result = await ScrapContainer.sum('current_quantity', { where: { is_active: true } });
        const total_scrap = total_scrap_result || 0;

        // 2. Movimientos (Generado vs Reciclado)
        const total_generated_result = await ScrapMovement.sum('quantity', { where: { movement_type: 'GENERACION' } });
        const total_generated = total_generated_result || 0;

        const total_recycled_result = await ScrapMovement.sum('quantity', { where: { movement_type: 'SALIDA_RECICLAJE' } });
        const total_recycled = total_recycled_result || 0;

        return {
            total_scrap,
            total_containers,
            containers_empty,
            containers_available,
            containers_full,
            total_generated,
            total_recycled,
            inventory_value: 0 // Preparado para futuro
        };
    }

    async getScrapByType() {
        const result = await ScrapContainer.findAll({
            attributes: [
                'scrap_catalog_id',
                [sequelize.fn('SUM', sequelize.col('current_quantity')), 'total_quantity']
            ],
            where: {
                is_active: true,
                scrap_catalog_id: { [Op.not]: null }
            },
            include: [{
                model: ScrapCatalog,
                as: 'scrap_type',
                attributes: ['name', 'code']
            }],
            group: ['scrap_catalog_id', 'scrap_type.id', 'scrap_type.name', 'scrap_type.code']
        });
        return result;
    }

    async getScrapByRack() {
        const result = await ScrapContainer.findAll({
            attributes: [
                'rack_id',
                [sequelize.fn('SUM', sequelize.col('current_quantity')), 'total_quantity']
            ],
            where: {
                is_active: true,
                rack_id: { [Op.not]: null }
            },
            include: [{
                model: StorageRack,
                as: 'rack',
                attributes: ['name', 'code']
            }],
            group: ['rack_id', 'rack.id', 'rack.name', 'rack.code']
        });
        return result;
    }

    async getMonthlyTrend() {
        // Asumiendo PostgreSQL (usando DATE_TRUNC)
        const result = await ScrapMovement.findAll({
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 'month'],
                'movement_type',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity']
            ],
            where: {
                movement_type: { [Op.in]: ['GENERACION', 'SALIDA_RECICLAJE'] }
            },
            group: [
                sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 
                'movement_type'
            ],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 'ASC']]
        });
        return result;
    }

    async getDailyTrend() {
        // Asumiendo PostgreSQL (usando DATE_TRUNC)
        const result = await ScrapMovement.findAll({
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('created_at')), 'day'],
                'movement_type',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity']
            ],
            where: {
                movement_type: { [Op.in]: ['GENERACION', 'SALIDA_RECICLAJE'] }
            },
            group: [
                sequelize.fn('DATE_TRUNC', 'day', sequelize.col('created_at')), 
                'movement_type'
            ],
            order: [[sequelize.fn('DATE_TRUNC', 'day', sequelize.col('created_at')), 'ASC']]
        });
        return result;
    }

    async getTopGenerators() {
        const result = await ScrapMovement.findAll({
            attributes: [
                'performed_by',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'total_generated']
            ],
            where: {
                movement_type: 'GENERACION',
                performed_by: { [Op.not]: null }
            },
            group: ['performed_by']
        });
        
        // Normalmente esto requeriría un include del User, pero si performed_by no tiene asociación configurada 
        // en el modelo, se retorna el ID. Idealmente se haría:
        /*
        include: [{
            model: User,
            as: 'user',
            attributes: ['username', 'email']
        }]
        y se agregaría al group.
        */
        
        return result;
    }

    async getMovementStatistics() {
        const result = await ScrapMovement.findAll({
            attributes: [
                'movement_type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity']
            ],
            group: ['movement_type']
        });

        // Parse result to map specific types requested
        let stats = {
            GENERACION: { count: 0, total_quantity: 0 },
            TRASLADO: { count: 0, total_quantity: 0 },
            SALIDA_RECICLAJE: { count: 0, total_quantity: 0 }
        };

        result.forEach(row => {
            const data = row.get({ plain: true });
            if (stats[data.movement_type] !== undefined) {
                stats[data.movement_type] = {
                    count: parseInt(data.count, 10),
                    total_quantity: parseFloat(data.total_quantity) || 0
                };
            }
        });

        return stats;
    }
}

module.exports = new ScrapDashboardService();
