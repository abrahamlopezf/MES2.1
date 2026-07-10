module.exports = (sequelize, DataTypes) => {
  const QrCode = sequelize.define(
    'QrCode',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      qr_code: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      batch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assigned_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'GENERADO',
      },
      entity_type: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      used_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelled_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'qr_codes',
      underscored: true,
    }
  );

  return QrCode;
};