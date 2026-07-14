const {
    sequelize,
    ScrapContainer,
    ScrapMovement,
    ProcessRun,
    ProcessRunOutput,
    TraceableItem,
    ScrapCatalog,
    StorageRack,
    AuditLog
} = require('../../database/models');

const { Op } = require('sequelize');

class ScrapService {
    /**
     * Registrar nuevo scrap generado durante un proceso
     */
    async registerScrap(data) {
        const transaction = await sequelize.transaction();
        try {
            // 1. Buscar contenedor
            const container = await this._findContainer(
                data.container_id,
                transaction
            );

            // 2. Validar estado
            this._validateContainer(container);

            // 3. Validar capacidad
            this._validateCapacity(
                container,
                data.quantity
            );

            // 4. Crear salida de producción (SCRAP)
            const processOutput = await this._createProcessOutput(
                data,
                transaction
            );

            // 5 & 6. Actualizar contenedor y Registrar movimiento (Ledger) usando updateContainerInventory
            const { updateContainerInventory } = require('./services/updateContainerInventory.service');
            await updateContainerInventory({
                container_id: container.id,
                quantity: data.quantity,
                movement_type: 'REGISTER',
                process_run_id: data.process_run_id,
                traceable_item_id: data.traceable_item_id,
                reference_folio: processOutput.folio,
                notes: data.notes,
                metadata: data.metadata,
                performed_by: data.user_id,
                transaction
            });

            // 7. Auditoría
            await this._createAudit(
                processOutput,
                data,
                transaction
            );

            await transaction.commit();
            return processOutput;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Transferencia entre racks / contenedores
     */
    async transferContainer(data) {
        const { source_container_id, destination_container_id, quantity, user_id, notes, metadata } = data;
        const transaction = await sequelize.transaction();
        try {
            const { updateContainerInventory } = require('./services/updateContainerInventory.service');
            const folio = `TRANS-${Date.now()}`;

            // Restar de origen
            await updateContainerInventory({
                container_id: source_container_id,
                quantity: -quantity,
                movement_type: 'TRANSFER',
                reference_folio: folio,
                notes: notes || 'Transferencia de salida',
                metadata,
                performed_by: user_id,
                transaction
            });

            // Sumar a destino
            await updateContainerInventory({
                container_id: destination_container_id,
                quantity: quantity,
                movement_type: 'TRANSFER',
                reference_folio: folio,
                notes: notes || 'Transferencia de entrada',
                metadata,
                performed_by: user_id,
                transaction
            });

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Vaciar contenedor
     */
    async emptyContainer(data) {
        const { container_id, user_id, notes, metadata } = data;
        const transaction = await sequelize.transaction();
        try {
            const container = await this._findContainer(container_id, transaction);
            const balanceBefore = Number(container.current_quantity);

            const { updateContainerInventory } = require('./services/updateContainerInventory.service');
            await updateContainerInventory({
                container_id,
                quantity: -balanceBefore,
                movement_type: 'EMPTY',
                notes: notes || 'Vaciado de contenedor',
                metadata,
                performed_by: user_id,
                transaction
            });

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reprocesar
     */
    async reprocessScrap(data) {
        const { container_id, quantity, user_id, notes, metadata } = data;
        const transaction = await sequelize.transaction();
        try {
            const { updateContainerInventory } = require('./services/updateContainerInventory.service');
            await updateContainerInventory({
                container_id,
                quantity: -quantity,
                movement_type: 'REPROCESS',
                notes: notes || 'Reprocesamiento de scrap',
                metadata,
                performed_by: user_id,
                transaction
            });

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Disposición final
     */
    async disposeScrap(data) {
        const { container_id, user_id, notes, metadata } = data;
        const transaction = await sequelize.transaction();
        try {
            const container = await this._findContainer(container_id, transaction);
            const balanceBefore = Number(container.current_quantity);

            const { updateContainerInventory } = require('./services/updateContainerInventory.service');
            await updateContainerInventory({
                container_id,
                quantity: -balanceBefore,
                movement_type: 'DISPOSAL',
                notes: notes || 'Disposición final de scrap',
                metadata,
                performed_by: user_id,
                transaction
            });

            // Adicionalmente marcamos el estado final del contenedor como DISPOSED
            container.status = 'DISPOSED';
            await container.save({ transaction });

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Ajuste manual
     */
    async adjustInventory(data) {
        const { container_id, new_quantity, cause, user_id, notes, metadata } = data;
        const transaction = await sequelize.transaction();
        try {
            const container = await this._findContainer(container_id, transaction);
            const balanceBefore = Number(container.current_quantity);
            const difference = Number(new_quantity) - balanceBefore;

            const { updateContainerInventory } = require('./services/updateContainerInventory.service');
            await updateContainerInventory({
                container_id,
                quantity: difference,
                movement_type: 'ADJUST',
                cause,
                notes: notes || `Ajuste manual: ${difference >= 0 ? '+' : ''}${difference}`,
                metadata,
                performed_by: user_id,
                transaction
            });

            await transaction.commit();
            return { success: true };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**************************************************
     ************** MÉTODOS PRIVADOS ******************
     **************************************************/

    async _findContainer(containerId, transaction) {
        const container = await ScrapContainer.findByPk(
            containerId,
            {
                include: [
                    {
                        model: ScrapCatalog,
                        as: 'scrap_type'
                    },
                    {
                        model: StorageRack,
                        as: 'rack'
                    }
                ],
                transaction
            }
        );

        if (!container) {
            throw new Error('El contenedor de scrap no existe.');
        }

        return container;
    }

    _validateContainer(container) {
        if (!container.is_active) {
            throw new Error(
                'El contenedor está inactivo.'
            );
        }

        switch (container.status) {
            case 'BLOCKED':
                throw new Error(
                    'El contenedor está bloqueado.'
                );
            case 'DISPOSED':
                throw new Error(
                    'El contenedor ya fue dado de baja.'
                );
            default:
                return true;
        }
    }

    _validateCapacity(container, quantity) {
        const current = Number(container.current_quantity);
        const capacity = Number(container.capacity);
        const incoming = Number(quantity);

        if (incoming <= 0) {
            throw new Error(
                'La cantidad debe ser mayor que cero.'
            );
        }

        if ((current + incoming) > capacity) {
            throw new Error(
                `El contenedor excede su capacidad máxima (${capacity} ${container.unit}).`
            );
        }
    }

    async _createProcessOutput(data, transaction) {
        return ProcessRunOutput.create({
            folio: data.folio || `SCRAP-${Date.now()}`,
            process_run_id: data.process_run_id,
            source_traceable_item_id: data.traceable_item_id,
            scrap_catalog_id: data.scrap_catalog_id,
            quantity_primary: data.quantity,
            primary_unit: data.unit || 'KG',
            status: 'REGISTRADO',
            produced_at: new Date(),
            scrap_weight: data.quantity,
            waste_weight: 0,
            notes: data.notes,
            metadata: data.metadata,
            created_by: data.user_id
        }, { transaction });
    }

    async _createAudit(
        processOutput,
        data,
        transaction
    ) {
        return AuditLog.create({
            module: 'SCRAP',
            action: 'REGISTER',
            record_id: processOutput.id,
            user_id: data.user_id,
            description:
                `Registro de ${data.quantity} ${data.unit || 'KG'} de scrap.`,
            metadata: data.metadata
        }, {
            transaction
        });
    }
}

module.exports = new ScrapService();