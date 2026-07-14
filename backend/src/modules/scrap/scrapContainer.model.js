const { Model, DataTypes } = require('sequelize');

class ScrapContainer extends Model { }

const initScrapContainerModel = (sequelize) => {
    ScrapContainer.init(
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
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            scrap_catalog_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            rack_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            capacity: {
                type: DataTypes.DECIMAL(12, 3),
                allowNull: false,
                defaultValue: 100,
                validate: {
                    gtZero(value) {
                        if (Number(value) <= 0) {
                            throw new Error('La capacidad debe ser mayor que 0.');
                        }
                    }
                }
            },
            current_quantity: {
                type: DataTypes.DECIMAL(12, 3),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    minZero(value) {
                        if (Number(value) < 0) {
                            throw new Error('La cantidad actual no puede ser menor a 0.');
                        }
                    }
                }
            },
            unit: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'KG',
            },
            status: {
                type: DataTypes.ENUM(
                    'EMPTY',
                    'AVAILABLE',
                    'FULL',
                    'BLOCKED',
                    'IN_REPROCESS',
                    'DISPOSED'
                ),
                allowNull: false,
                defaultValue: 'EMPTY',
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            created_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            updated_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: 'ScrapContainer',
            tableName: 'scrap_containers',
            underscored: true,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
    return ScrapContainer;
};

module.exports = initScrapContainerModel;