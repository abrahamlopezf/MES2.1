module.exports = (sequelize, DataTypes) => {
  const QrCode = sequelize.define(
    'QrCode',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      serial: {
        type: DataTypes.BIGINT,
        allowNull: false,
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
      purpose: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'RECEPTION',
      },
      assigned_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'GENERATED',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
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