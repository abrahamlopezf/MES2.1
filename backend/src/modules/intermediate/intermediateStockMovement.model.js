module.exports = (sequelize, DataTypes) => {
    const IntermediateStockMovement = sequelize.define(
        'IntermediateStockMovement',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            intermediate_stock_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            intermediate_material_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            area_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            rack_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            movement_type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },

            quantity_primary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: false,
            },

            primary_unit: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },

            quantity_secondary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: true,
            },

            secondary_unit: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },

            balance_before_primary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: false,
            },

            balance_after_primary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: false,
            },

            balance_before_secondary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: true,
            },

            balance_after_secondary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: true,
            },

            reference_type: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            reference_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            reference_folio: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            metadata: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            created_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
        },
        {
            tableName: 'intermediate_stock_movements',
            timestamps: true,
            underscored: true,
        }
    );

    return IntermediateStockMovement;
};