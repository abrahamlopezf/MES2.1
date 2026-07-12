'use strict';

module.exports = (sequelize, DataTypes) => {

    const ProcessOutputItem = sequelize.define(
        'ProcessOutputItem',
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

            description: {
                type: DataTypes.STRING,
                allowNull: false
            },

            quantity: {
                type: DataTypes.DECIMAL(12, 3),
                allowNull: false
            },

            unit: {
                type: DataTypes.STRING,
                defaultValue: 'KG'
            }

        },
        {
            tableName: 'process_output_items',
            timestamps: true,
            underscored: true
        }
    );


    return ProcessOutputItem;
};