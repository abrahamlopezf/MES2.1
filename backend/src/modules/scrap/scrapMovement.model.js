const { Model, DataTypes } = require('sequelize');

class ScrapMovement extends Model { }

const initScrapMovement = (sequelize) => {

    ScrapMovement.init({

        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        container_id: DataTypes.INTEGER,

        process_run_id: DataTypes.INTEGER,

        traceable_item_id: DataTypes.INTEGER,

        movement_type: DataTypes.ENUM(
            'GENERACION',
            'TRASLADO',
            'AJUSTE',
            'SALIDA_RECICLAJE',
            'CANCELACION'
        ),

        cause: DataTypes.STRING,

        quantity: DataTypes.DECIMAL(12, 3),

        unit: DataTypes.STRING,

        balance_before: DataTypes.DECIMAL(12, 3),

        balance_after: DataTypes.DECIMAL(12, 3),

        reference_folio: DataTypes.STRING,

        notes: DataTypes.TEXT,

        metadata: DataTypes.JSONB,

        performed_by: DataTypes.INTEGER,

        performed_at: DataTypes.DATE

    }, {
        sequelize,
        tableName: 'scrap_movements',
        modelName: 'ScrapMovement',
        underscored: true,
        timestamps: true
    });

    return ScrapMovement;

};

module.exports = initScrapMovement;