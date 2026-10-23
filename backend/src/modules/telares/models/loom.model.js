module.exports = (sequelize, DataTypes) => {
  const Loom = sequelize.define(
    'Loom',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      model: {
        type: DataTypes.STRING(100),
        defaultValue: 'LOHIA LSL-6',
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'CIRCULAR',
      },
      rpm: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 120,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'DISPONIBLE',
      },
      current_bom_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      active_warp_rack_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      active_weft_rack_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      specifications: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ficha técnica / Especificaciones operativas del telar',
      },
      supported_pti_types: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Lista de IDs de PTI (carretes/bobinas) compatibles con este telar',
      },
      supported_bom_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Lista de IDs de Fichas Técnicas / BOMs de Rollos que este telar puede producir',
      },
    },
    {
      tableName: 'looms',
      timestamps: true,
      underscored: true,
    }
  );

  return Loom;
};
