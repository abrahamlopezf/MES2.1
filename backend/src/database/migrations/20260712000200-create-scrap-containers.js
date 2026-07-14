'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('scrap_containers', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            code: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },

            name: {
                type: Sequelize.STRING(120),
                allowNull: false
            },

            area_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'areas',
                    key: 'id'
                },
                onUpdate: 'CASCADE'
            },

            scrap_type_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'scrap_types',
                    key: 'id'
                },
                onUpdate: 'CASCADE'
            },

            qr_code_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'qr_codes',
                    key: 'id'
                },
                onUpdate: 'CASCADE'
            },

            container_type: {
                type: Sequelize.ENUM(
                    'BIG_BAG',
                    'TAMBOR',
                    'CAJA',
                    'RACK',
                    'CONTENEDOR'
                ),
                allowNull: false
            },

            capacity: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false
            },

            unit: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'KG'
            },

            location: {
                type: Sequelize.STRING(120)
            },

            status: {
                type: Sequelize.ENUM(
                    'VACIO',
                    'EN_USO',
                    'LLENO',
                    'BLOQUEADO'
                ),
                defaultValue: 'VACIO'
            },

            metadata: {
                type: Sequelize.JSONB
            },

            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },

            created_by: Sequelize.INTEGER,
            updated_by: Sequelize.INTEGER,

            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },

            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }

        });

    },

    async down(queryInterface) {
        await queryInterface.dropTable('scrap_containers');
    }
};