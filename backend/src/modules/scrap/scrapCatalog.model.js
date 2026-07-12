'use strict';

module.exports = (sequelize, DataTypes) => {

    const ScrapCatalog = sequelize.define(
        'ScrapCatalog',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },

            code: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false
            },

            description: {
                type: DataTypes.TEXT
            },

            unit: {
                type: DataTypes.STRING,
                defaultValue: 'KG'
            },

            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },

            waste_reason: {
                type: DataTypes.STRING
            },

            category: {
                type: DataTypes.STRING
            }
        },
        {
            tableName: 'scrap_catalog',
            timestamps: true,
            underscored: true
        }
    );


    return ScrapCatalog;
};