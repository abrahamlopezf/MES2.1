const { eventBus, ProductionEvents, ScrapEvents } = require('../../core/events/eventBus');
const { ProcessRunInput, ProcessRunOutput, ScrapContainer } = require('../../database/models');
const { updateContainerInventory } = require('./services/updateContainerInventory.service');

/**
 * Registra los listeners del módulo de Scrap
 */
const registerScrapListeners = () => {

    eventBus.on(ProductionEvents.PRODUCTION_FINISHED, async (payload) => {
        try {
            const { process_run_id, user_id } = payload;
            
            if (!process_run_id) return;

            // 1. Calcular scrap generado (Diferencia entre Materia Prima y Producto Terminado)
            const inputs = await ProcessRunInput.findAll({ where: { process_run_id } });
            const outputs = await ProcessRunOutput.findAll({ where: { process_run_id } });

            let totalInputs = 0;
            inputs.forEach(input => {
                // Asumimos que los inputs principales se manejan en KG u otra unidad consistente
                totalInputs += Number(input.quantity_used || 0);
            });

            let totalOutputs = 0;
            outputs.forEach(output => {
                // Buscamos la cantidad que esté en KG o sumamos la secundaria si es el caso
                const qty = output.secondary_unit === 'KG' ? output.quantity_secondary : output.quantity_primary;
                totalOutputs += Number(qty || 0);
            });

            const generatedScrap = totalInputs - totalOutputs;

            // Solo registramos si hay scrap generado válido
            if (generatedScrap > 0) {
                // Buscar un contenedor disponible y activo para inyectar este scrap
                // En un entorno real se podría filtrar por `scrap_catalog_id` (tipo de scrap)
                const container = await ScrapContainer.findOne({
                    where: { is_active: true },
                    order: [['current_quantity', 'ASC']] // Buscar el más vacío
                });

                if (container) {
                    // 2. Llamar updateContainerInventory()
                    // 3. Registrar referencia del process_run
                    await updateContainerInventory({
                        container_id: container.id,
                        quantity: generatedScrap,
                        movement_type: 'GENERACION',
                        process_run_id: process_run_id,
                        notes: `Scrap generado automáticamente por cierre de orden de producción #${process_run_id}`,
                        performed_by: user_id || 1
                    });
                }
            }

        } catch (error) {
            // El catch asegura que el proceso principal que emitió el evento no falle si esto se ejecuta de forma asíncrona
        }
    });

    eventBus.on(ScrapEvents.SCRAP_TRANSFERRED, async (payload) => {
        try {
            // Payload esperado: { container_id, movement_type, quantity, current_quantity, status, performed_by }
            // Preparar payload de sincronización para Warehouse
            const warehousePayload = {
                source: 'SCRAP_MODULE',
                action: 'TRANSFER',
                data: payload,
                timestamp: new Date()
            };
            
            // TODO: Integración futura con el módulo Warehouse
            // await WarehouseService.registerMovement(warehousePayload);
        } catch (error) {
            // Failsafe
        }
    });

    eventBus.on(ScrapEvents.SCRAP_RECYCLED, async (payload) => {
        try {
            // Payload esperado: { container_id, movement_type, quantity, current_quantity, status, performed_by }
            // Preparar payload de sincronización para Warehouse
            const warehousePayload = {
                source: 'SCRAP_MODULE',
                action: 'RECYCLE_DISPOSAL',
                data: payload,
                timestamp: new Date()
            };
            
            // TODO: Integración futura con el módulo Warehouse
            // await WarehouseService.registerDisposal(warehousePayload);
        } catch (error) {
            // Failsafe
        }
    });

};

module.exports = registerScrapListeners;
