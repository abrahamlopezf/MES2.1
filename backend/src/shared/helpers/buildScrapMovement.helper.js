const buildScrapMovement = ({
    container,
    processOutput,
    data,
    balanceBefore,
    balanceAfter
}) => {

    return {
        container_id:
            container.id,
        process_run_id:
            data.process_run_id,
        traceable_item_id:
            data.traceable_item_id,
        movement_type:
            'REGISTER',
        quantity:
            data.quantity,
        unit:
            container.unit,
        balance_before:
            balanceBefore,
        balance_after:
            balanceAfter,
        reference_folio:
            processOutput.folio,
        notes:
            data.notes,
        metadata:
            data.metadata,
        performed_by:
            data.user_id
    };
};

module.exports = buildScrapMovement;