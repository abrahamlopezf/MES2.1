module.exports = (sequelize, DataTypes) => {
  const ProcessPreparation = sequelize.define(
    'ProcessPreparation',
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

      formula_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      from_area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      to_area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      destination_qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      destination_traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      target_intermediate_material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      total_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },

      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'TRANSFERIDA',
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      prepared_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      prepared_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      received_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      received_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'process_preparations',
      timestamps: true,
      underscored: true,
    }
  );

  return ProcessPreparation;
};