const { Model, DataTypes } = require('sequelize');

class ScrapContainerStock extends Model { }

const initScrapContainerStock = (sequelize) => {
    ScrapContainerStock.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        container_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        quantity: {
            type: DataTypes.DECIMAL(12, 3),
            allowNull: false,
            defaultValue: 0
        },
        unit: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'KG'
        },
        last_movement_at: {
            type: DataTypes.DATE
        },
        metadata: {
            type: DataTypes.JSONB
        }
    }, {
        sequelize,
        tableName: 'scrap_container_stock',
        modelName: 'ScrapContainerStock',
        underscored: true,
        timestamps: true
    });

    return ScrapContainerStock;
};

module.exports = initScrapContainerStock;
