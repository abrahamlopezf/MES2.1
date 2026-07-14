"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scrap_movements", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      container_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "scrap_containers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      process_run_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "process_runs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "traceable_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      movement_type: {
        type: Sequelize.ENUM(
          "REGISTER",
          "ADJUST",
          "TRANSFER",
          "EMPTY",
          "REPROCESS",
          "DISPOSAL",
        ),
        allowNull: false,
      },

      cause: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      quantity: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
      },

      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "KG",
      },

      balance_before: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
      },

      balance_after: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
      },

      reference_folio: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      performed_by: {
        type: Sequelize.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      performed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("scrap_movements");
  },
};
