const { sequelize, ScrapContainer } = require('../../../database/models');
const ScrapLedgerService = require('./scrapLedger.service');
const { calculateContainerStatus } = require('../helpers/inventoryStatus.helper');

const updateContainerInventory = async ({
    container_id,
    quantity, // positivo para entrada, negativo para salida/transferencia
    movement_type,
    cause = null,
    process_run_id = null,
    traceable_item_id = null,
    reference_folio = null,
    notes = null,
    metadata = {},
    performed_by,
    transaction = null
}) => {
    const ownTransaction = !transaction;
    const trx = transaction || await sequelize.transaction();
    let isCommitted = false;

    try {
        const container = await ScrapContainer.findByPk(container_id, {
            transaction: trx,
            lock: true
        });

        if (!container) {
            throw new Error('El contenedor no existe.');
        }

        // Validación de is_active y status
        if (!container.is_active) {
            throw new Error('El contenedor está inactivo.');
        }
        if (container.status === 'BLOCKED') {
            throw new Error('El contenedor está bloqueado.');
        }
        if (container.status === 'DISPOSED') {
            throw new Error('El contenedor ya fue dado de baja.');
        }

        const balanceBefore = Number(container.current_quantity);
        const qtyChange = Number(quantity);
        const balanceAfter = balanceBefore + qtyChange;

        if (balanceAfter < 0) {
            throw new Error('Inconsistencia: El saldo no puede ser negativo.');
        }
        if (balanceAfter > Number(container.capacity)) {
            throw new Error(`Inconsistencia: El saldo (${balanceAfter}) supera la capacidad del contenedor (${container.capacity}).`);
        }

        // Registrar Ledger antes de actualizar el contenedor (Requisito del usuario)
        await ScrapLedgerService.registerMovement({
            transaction: trx,
            container_id: container.id,
            process_run_id,
            traceable_item_id,
            movement_type,
            cause,
            quantity: Math.abs(qtyChange),
            unit: container.unit,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reference_folio,
            notes,
            metadata,
            performed_by
        });

        // Actualizar contenedor
        container.current_quantity = balanceAfter;
        container.status = calculateContainerStatus(balanceAfter, container.capacity);
        await container.save({ transaction: trx });

        if (ownTransaction) {
            await trx.commit();
            isCommitted = true;
        }

        // --- EDA Integration ---
        try {
            const { eventBus, ScrapEvents } = require('../../../core/events/eventBus');
            const eventPayload = {
                container_id: container.id,
                movement_type,
                quantity: qtyChange,
                current_quantity: container.current_quantity,
                status: container.status,
                performed_by
            };

            if (movement_type === 'GENERACION') eventBus.emit(ScrapEvents.SCRAP_GENERATED, eventPayload);
            if (movement_type === 'TRASLADO') eventBus.emit(ScrapEvents.SCRAP_TRANSFERRED, eventPayload);
            if (movement_type === 'SALIDA_RECICLAJE') eventBus.emit(ScrapEvents.SCRAP_RECYCLED, eventPayload);

            if (container.status === 'FULL') eventBus.emit(ScrapEvents.SCRAP_CONTAINER_FULL, eventPayload);
            if (container.status === 'EMPTY') eventBus.emit(ScrapEvents.SCRAP_CONTAINER_EMPTY, eventPayload);
            if (container.status === 'NEAR_FULL') eventBus.emit(ScrapEvents.SCRAP_LOW_CAPACITY, eventPayload);
        } catch (eventError) {
            console.error("Error emitiendo eventos de Scrap:", eventError);
        }

        return container;
    } catch (error) {
        if (ownTransaction && !isCommitted) {
            await trx.rollback();
        }
        throw error;
    }
};

module.exports = {
    updateContainerInventory
};
