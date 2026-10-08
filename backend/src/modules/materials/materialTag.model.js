module.exports = (sequelize, DataTypes) => {
  const MaterialTag = sequelize.define('MaterialTag', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    material_id: { type: DataTypes.INTEGER, allowNull: false },
    tag_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'material_tags',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['material_id', 'tag_id'] }
    ]
  });

  return MaterialTag;
};
