module.exports = (sequelize, DataTypes) => {
  const ProcessRun = sequelize.define(
    'ProcessRun',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      folio: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },

      process_area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      station_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'EN_PROCESO',
      },

      source_traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      source_qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      started_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      finished_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      finished_at: {
        type: DataTypes.DATE,
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
    },
    {
      tableName: 'process_runs',
      timestamps: true,
      underscored: true,
    }
  );

  return ProcessRun;
};