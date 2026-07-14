const { ScrapMovement } = require('../../../database/models');

class ScrapLedgerService {
    static async registerMovement({
        transaction,
        container_id,
        process_run_id = null,
        traceable_item_id = null,
        movement_type,
        cause = null,
        quantity,
        unit = 'KG',
        balance_before,
        balance_after,
        reference_folio = null,
        notes = null,
        metadata = {},
        performed_by
    }) {
        if (!movement_type) {
            throw new Error('movement_type es requerido');
        }

        if (Number(quantity) <= 0) {
            throw new Error('quantity debe ser mayor a cero');
        }

        return ScrapMovement.create({
            container_id,
            process_run_id,
            traceable_item_id,
            movement_type,
            cause,
            quantity,
            unit: unit || 'KG',
            balance_before,
            balance_after,
            reference_folio,
            notes,
            metadata,
            performed_by
        }, {
            transaction
        });
    }

    // Mantener register como alias por compatibilidad
    static async register(data) {
        return this.registerMovement(data);
    }
}

module.exports = ScrapLedgerService;
