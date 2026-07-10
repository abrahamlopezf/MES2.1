module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      action: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },

      entity_type: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },

      entity_id: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },

      module: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      before_data: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      after_data: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      ip_address: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'audit_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,
    }
  );

  return AuditLog;
};