const { DataTypes, Model } = require('sequelize');

class ScrapType extends Model { }

const initScrapTypeModel = (sequelize) => {
    ScrapType.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },

            name: {
                type: DataTypes.STRING(120),
                allowNull: false,
            },

            category: {
                type: DataTypes.ENUM(
                    'SCRAP',
                    'MERMA'
                ),
                allowNull: false,
            },

            recyclable: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            description: DataTypes.TEXT,

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            created_by: DataTypes.INTEGER,
            updated_by: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'ScrapType',
            tableName: 'scrap_types',
            underscored: true,
            timestamps: true,
        }
    );

    return ScrapType;
};

module.exports = initScrapTypeModel;