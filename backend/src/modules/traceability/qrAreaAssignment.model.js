const {
  QR_AREA_ASSIGNMENT_STATUS,
} = require('./traceability.constants');

module.exports = (sequelize, DataTypes) => {
  const QrAreaAssignment = sequelize.define(
    'QrAreaAssignment',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assigned_to_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(QR_AREA_ASSIGNMENT_STATUS)),
        allowNull: false,
        defaultValue: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      released_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
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
      tableName: 'qr_area_assignments',
      underscored: true,
      timestamps: true,
    }
  );

  return QrAreaAssignment;
};