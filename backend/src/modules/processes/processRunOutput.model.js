module.exports = (sequelize, DataTypes) => {
    const ProcessRunOutput = sequelize.define(
        'ProcessRunOutput',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            folio: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },

            process_run_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            source_traceable_item_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            source_qr_code_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            intermediate_material_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            rack_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            intermediate_stock_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            output_type: {
                type: DataTypes.STRING(40),
                allowNull: false,
                defaultValue: 'GOOD_OUTPUT',
            },

            quantity_primary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: false,
            },

            primary_unit: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'CARRETE',
            },

            quantity_secondary: {
                type: DataTypes.DECIMAL(14, 3),
                allowNull: true,
            },

            secondary_unit: {
                type: DataTypes.STRING(20),
                allowNull: true,
                defaultValue: 'KG',
            },

            status: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: 'REGISTRADO',
            },

            produced_at: {
                type: DataTypes.DATE,
                allowNull: false,
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
            tableName: 'process_run_outputs',
            timestamps: true,
            underscored: true,
        }
    );

    return ProcessRunOutput;
};