module.exports = (sequelize, DataTypes) => {

    const ScrapMovement = sequelize.define(
        'ScrapMovement',
        {

            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },

            process_run_output_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },

            scrap_catalog_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },

            from_rack_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },

            to_rack_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },

            movement_type: {
                type: DataTypes.ENUM(
                    'TRANSFERENCIA',
                    'CONSUMO',
                    'AJUSTE'
                ),
                allowNull: false
            },

            quantity: {
                type: DataTypes.DECIMAL(12, 3),
                allowNull: false
            },

            unit: {
                type: DataTypes.STRING,
                allowNull: false
            },

            status: {
                type: DataTypes.ENUM(
                    'REGISTRADO',
                    'CANCELADO'
                ),
                allowNull: false
            },

            notes: {
                type: DataTypes.TEXT
            },

            created_by: {
                type: DataTypes.INTEGER
            },

            updated_by: {
                type: DataTypes.INTEGER
            }

        },
        {
            tableName: 'scrap_movements',
            timestamps: true
        });


    return ScrapMovement;

};