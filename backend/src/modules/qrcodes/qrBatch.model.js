module.exports = (sequelize, DataTypes) => {
  const QrBatch = sequelize.define(
    'QrBatch',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      batch_code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assigned_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'CREATED',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'qr_batches',
      underscored: true,
    }
  );

  return QrBatch;
};