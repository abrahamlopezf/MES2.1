const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const initRoleModel = require('../../modules/roles/role.model');
const initPermissionModel = require('../../modules/permissions/permission.model');
const initAreaModel = require('../../modules/areas/area.model');
const initUserModel = require('../../modules/users/user.model');

const initQrBatchModel = require('../../modules/qrcodes/qrBatch.model');
const initQrCodeModel = require('../../modules/qrcodes/qrCode.model');
const initTraceabilityEventModel = require('../../modules/traceability/traceabilityEvent.model');

const initMaterialCodeModel = require('../../modules/materials/materialCode.model');
const initMaterialFamilyModel = require('../../modules/materials/materialFamily.model');
const initMaterialBrandModel = require('../../modules/materials/materialBrand.model');
const initMaterialTypeModel = require('../../modules/materials/materialType.model');
const initLocationModel = require('../../modules/materials/location/location.model');
const initMaterialModel = require('../../modules/materials/material.model');
const initMaterialUnitModel = require('../../modules/materials/materialUnit.model');
const initRankingModel = require('../../modules/materials/ranking.model');

const initInventoryModel = require('../../modules/warehouse/inventory.model');
const initInventoryMovementModel = require('../../modules/warehouse/inventoryMovement.model');
const initLoteModel = require('../../modules/warehouse/lote.model');
const initTipoBajaModel = require('../../modules/warehouse/tipoBaja.model');
const initMaterialConsumptionModel = require('../../modules/warehouse/materialConsumption.model');
const initMaterialConsumptionItemModel = require('../../modules/warehouse/materialConsumptionItem.model');

// WMS Master Data
const initQrAreaAssignmentModel = require('../../modules/traceability/qrAreaAssignment.model');
const initTraceableItemModel = require('../../modules/traceability/traceableItem.model');
const initTraceabilityMovementModel = require('../../modules/traceability/traceabilityMovement.model');
const initTraceabilityLinkModel = require('../../modules/traceability/traceabilityLink.model');

const initAuditLogModel = require('../../modules/audit/auditLog.model');

const db = {};

db.sequelize = sequelize;

db.Role = initRoleModel(sequelize);
db.Permission = initPermissionModel(sequelize);
db.Area = initAreaModel(sequelize);
db.User = initUserModel(sequelize);

db.QrBatch = initQrBatchModel(sequelize, DataTypes);
db.QrCode = initQrCodeModel(sequelize, DataTypes);
db.TraceabilityEvent = initTraceabilityEventModel(sequelize, DataTypes);

db.MaterialCode = initMaterialCodeModel(sequelize, DataTypes);
db.MaterialFamily = initMaterialFamilyModel(sequelize, DataTypes);
db.MaterialBrand = initMaterialBrandModel(sequelize, DataTypes);
db.MaterialType = initMaterialTypeModel(sequelize, DataTypes);
db.Location = initLocationModel(sequelize, DataTypes);
db.Material = initMaterialModel(sequelize, DataTypes);
db.MaterialUnit = initMaterialUnitModel(sequelize, DataTypes);
db.Ranking = initRankingModel(sequelize, DataTypes);
db.Inventory = initInventoryModel(sequelize, DataTypes);
db.InventoryMovement = initInventoryMovementModel(sequelize, DataTypes);
db.Lote = initLoteModel(sequelize, DataTypes);
db.TipoBaja = initTipoBajaModel(sequelize, DataTypes);
db.MaterialConsumption = initMaterialConsumptionModel(sequelize, DataTypes);
db.MaterialConsumptionItem = initMaterialConsumptionItemModel(sequelize, DataTypes);

db.QrAreaAssignment = initQrAreaAssignmentModel(sequelize, DataTypes);
db.TraceableItem = initTraceableItemModel(sequelize, DataTypes);
db.TraceabilityMovement = initTraceabilityMovementModel(sequelize, DataTypes);
db.TraceabilityLink = initTraceabilityLinkModel(sequelize, DataTypes);

db.AuditLog = initAuditLogModel(sequelize, DataTypes);

db.Role.belongsToMany(db.Permission, {
  through: 'role_permissions',
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions',
});

db.Permission.belongsToMany(db.Role, {
  through: 'role_permissions',
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles',
});

db.User.belongsTo(db.Role, {
  foreignKey: 'role_id',
  as: 'role',
});

db.Role.hasMany(db.User, {
  foreignKey: 'role_id',
  as: 'users',
});

db.User.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});

db.Area.hasMany(db.User, {
  foreignKey: 'area_id',
  as: 'users',
});

/**
 * QR BATCH RELATIONS
 */

db.QrBatch.hasMany(db.QrCode, {
  foreignKey: 'batch_id',
  as: 'codes',
});

db.QrCode.belongsTo(db.QrBatch, {
  foreignKey: 'batch_id',
  as: 'batch',
});

db.QrBatch.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.QrBatch.belongsTo(db.Area, {
  foreignKey: 'assigned_area_id',
  as: 'assignedArea',
});

/**
 * QR CODE RELATIONS
 */

db.QrCode.belongsTo(db.Area, {
  foreignKey: 'assigned_area_id',
  as: 'assignedArea',
});



db.QrCode.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.QrCode.hasMany(db.TraceabilityEvent, {
  foreignKey: 'qr_code_id',
  as: 'traceabilityEvents',
});

/**
 * TRACEABILITY EVENT RELATIONS
 */

db.TraceabilityEvent.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qrCode',
});

db.TraceabilityEvent.belongsTo(db.User, {
  foreignKey: 'performed_by',
  as: 'performedByUser',
});

db.TraceabilityEvent.belongsTo(db.Area, {
  foreignKey: 'from_area_id',
  as: 'fromArea',
});

db.TraceabilityEvent.belongsTo(db.Area, {
  foreignKey: 'to_area_id',
  as: 'toArea',
});

['MaterialCode', 'MaterialFamily', 'MaterialBrand', 'MaterialType', 'Location', 'Material', 'MaterialUnit'].forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

/* =========================
   RANKING & MATERIAL
========================= */

db.Material.belongsTo(db.Ranking, {
  foreignKey: 'ranking_id',
  as: 'ranking',
});

db.Ranking.hasMany(db.Material, {
  foreignKey: 'ranking_id',
  as: 'materials',
});

/* =========================
   WAREHOUSE & LOTES
========================= */

db.Lote.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.Material.hasMany(db.Lote, {
  foreignKey: 'material_id',
  as: 'lotes',
});

db.Lote.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

db.Lote.belongsTo(db.QrCode, {
  foreignKey: 'qr_id',
  as: 'qr_code',
});

db.Lote.belongsTo(db.Location, {
  foreignKey: 'location_id',
  as: 'location',
});

db.TraceabilityEvent.belongsTo(db.User, {
  foreignKey: 'performed_by',
  as: 'user'
});

db.Inventory.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.Material.hasOne(db.Inventory, {
  foreignKey: 'material_id',
  as: 'inventory',
});

db.InventoryMovement.belongsTo(db.Inventory, {
  foreignKey: 'inventory_id',
  as: 'inventory',
});

db.Inventory.hasMany(db.InventoryMovement, {
  foreignKey: 'inventory_id',
  as: 'movements',
});

// db.Inventory.belongsTo(db.User, {
//   foreignKey: 'user_id',
//   as: 'user',
// });

/* =========================
   QR AREA ASSIGNMENTS
========================= */

db.QrCode.hasMany(db.QrAreaAssignment, {
  foreignKey: 'qr_code_id',
  as: 'area_assignments',
});

db.QrAreaAssignment.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qr_code',
});

db.Area.hasMany(db.QrAreaAssignment, {
  foreignKey: 'area_id',
  as: 'qr_assignments',
});

db.QrAreaAssignment.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});

db.User.hasMany(db.QrAreaAssignment, {
  foreignKey: 'assigned_to_user_id',
  as: 'assigned_qr_codes',
});

db.QrAreaAssignment.belongsTo(db.User, {
  foreignKey: 'assigned_to_user_id',
  as: 'assigned_user',
});

db.QrAreaAssignment.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.QrAreaAssignment.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

/* =========================
   TRACEABLE ITEMS
========================= */

db.QrCode.hasOne(db.TraceableItem, {
  foreignKey: 'qr_code_id',
  as: 'traceable_item',
});

db.TraceableItem.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qr_code',
});

db.Material.hasMany(db.TraceableItem, {
  foreignKey: 'material_id',
  as: 'traceable_items',
});

db.TraceableItem.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.Area.hasMany(db.TraceableItem, {
  foreignKey: 'origin_area_id',
  as: 'origin_traceable_items',
});

db.TraceableItem.belongsTo(db.Area, {
  foreignKey: 'origin_area_id',
  as: 'origin_area',
});

db.Area.hasMany(db.TraceableItem, {
  foreignKey: 'current_area_id',
  as: 'current_traceable_items',
});

db.TraceableItem.belongsTo(db.Area, {
  foreignKey: 'current_area_id',
  as: 'current_area',
});

db.TraceableItem.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.TraceableItem.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

/* =========================
   TRACEABILITY MOVEMENTS
========================= */

db.TraceableItem.hasMany(db.TraceabilityMovement, {
  foreignKey: 'traceable_item_id',
  as: 'movements',
});

db.TraceabilityMovement.belongsTo(db.TraceableItem, {
  foreignKey: 'traceable_item_id',
  as: 'traceable_item',
});

db.QrCode.hasMany(db.TraceabilityMovement, {
  foreignKey: 'qr_code_id',
  as: 'traceability_movements',
});

db.TraceabilityMovement.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qr_code',
});

db.Area.hasMany(db.TraceabilityMovement, {
  foreignKey: 'from_area_id',
  as: 'traceability_movements_from',
});

db.TraceabilityMovement.belongsTo(db.Area, {
  foreignKey: 'from_area_id',
  as: 'from_area',
});

db.Area.hasMany(db.TraceabilityMovement, {
  foreignKey: 'to_area_id',
  as: 'traceability_movements_to',
});

db.TraceabilityMovement.belongsTo(db.Area, {
  foreignKey: 'to_area_id',
  as: 'to_area',
});

db.TraceabilityMovement.belongsTo(db.User, {
  foreignKey: 'performed_by',
  as: 'performer',
});

/* =========================
   TRACEABILITY LINKS
========================= */

db.TraceableItem.hasMany(db.TraceabilityLink, {
  foreignKey: 'parent_traceable_item_id',
  as: 'child_links',
});

db.TraceabilityLink.belongsTo(db.TraceableItem, {
  foreignKey: 'parent_traceable_item_id',
  as: 'parent_traceable_item',
});

db.TraceableItem.hasMany(db.TraceabilityLink, {
  foreignKey: 'child_traceable_item_id',
  as: 'parent_links',
});

db.TraceabilityLink.belongsTo(db.TraceableItem, {
  foreignKey: 'child_traceable_item_id',
  as: 'child_traceable_item',
});

db.QrCode.hasMany(db.TraceabilityLink, {
  foreignKey: 'parent_qr_code_id',
  as: 'child_qr_links',
});

db.TraceabilityLink.belongsTo(db.QrCode, {
  foreignKey: 'parent_qr_code_id',
  as: 'parent_qr_code',
});

db.QrCode.hasMany(db.TraceabilityLink, {
  foreignKey: 'child_qr_code_id',
  as: 'parent_qr_links',
});

db.TraceabilityLink.belongsTo(db.QrCode, {
  foreignKey: 'child_qr_code_id',
  as: 'child_qr_code',
});

db.Area.hasMany(db.TraceabilityLink, {
  foreignKey: 'process_area_id',
  as: 'traceability_process_links',
});

db.TraceabilityLink.belongsTo(db.Area, {
  foreignKey: 'process_area_id',
  as: 'process_area',
});

db.TraceabilityLink.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.MaterialConsumption.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.MaterialConsumption.hasMany(db.MaterialConsumptionItem, { foreignKey: 'consumption_id', as: 'items' });

db.MaterialConsumptionItem.belongsTo(db.MaterialConsumption, { foreignKey: 'consumption_id', as: 'consumption' });
db.MaterialConsumptionItem.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });
db.MaterialConsumptionItem.belongsTo(db.Lote, { foreignKey: 'lote_id', as: 'lote' });
db.MaterialConsumptionItem.belongsTo(db.QrCode, { foreignKey: 'qr_id', as: 'qr' });

module.exports = db;