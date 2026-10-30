const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const initRoleModel = require('../../modules/roles/role.model');
const initPermissionModel = require('../../modules/permissions/permission.model');
const initAreaModel = require('../../modules/areas/area.model');
const { initSubareaModel } = require('../../modules/areas/subarea.model');
const initUserModel = require('../../modules/users/user.model');
const initNotificationModel = require('../../modules/notifications/notification.model');
const initPasswordResetModel = require('../../modules/auth/passwordReset.model');

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
const initTagModel = require('../../modules/materials/tag.model');
const initMaterialTagModel = require('../../modules/materials/materialTag.model');

const initSupplierModel = require('../../modules/catalogs/supplier/supplier.model');

const initInventoryModel = require('../../modules/warehouse/inventory.model');
const initInventoryMovementModel = require('../../modules/warehouse/inventoryMovement.model');
const initLoteModel = require('../../modules/warehouse/lote.model');
const initTipoBajaModel = require('../../modules/warehouse/tipoBaja.model');
const initMaterialConsumptionModel = require('../../modules/warehouse/materialConsumption.model');
const initMaterialConsumptionItemModel = require('../../modules/warehouse/materialConsumptionItem.model');
const initConsumptionOrderModel = require('../../modules/warehouse/consumptionOrder.model');
const initConsumptionOrderItemModel = require('../../modules/warehouse/consumptionOrderItem.model');
const initWipInventoryModel = require('../../modules/warehouse/wipInventory.model');

// WMS Master Data
const initQrAreaAssignmentModel = require('../../modules/traceability/qrAreaAssignment.model');
const initTraceableItemModel = require('../../modules/traceability/traceableItem.model');
const initTraceabilityMovementModel = require('../../modules/traceability/traceabilityMovement.model');
const initTraceabilityLinkModel = require('../../modules/traceability/traceabilityLink.model');

const initAuditLogModel = require('../../modules/audit/auditLog.model');

// Formulas & Mezclado
const initProcessFormulaModel = require('../../modules/formulas/processFormula.model');
const initProcessFormulaItemModel = require('../../modules/formulas/processFormulaItem.model');
const initProcessPreparationModel = require('../../modules/formulas/processPreparation.model');
const initProcessPreparationInputModel = require('../../modules/formulas/processPreparationInput.model');

const db = {};

db.sequelize = sequelize;

db.Role = initRoleModel(sequelize);
db.Permission = initPermissionModel(sequelize);
db.Area = initAreaModel(sequelize);
db.Subarea = initSubareaModel(sequelize);
db.User = initUserModel(sequelize);
db.Notification = initNotificationModel(sequelize);
db.PasswordReset = initPasswordResetModel(sequelize);

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
db.Tag = initTagModel(sequelize, DataTypes);
db.MaterialTag = initMaterialTagModel(sequelize, DataTypes);
db.Supplier = initSupplierModel(sequelize);
db.Inventory = initInventoryModel(sequelize, DataTypes);
db.InventoryMovement = initInventoryMovementModel(sequelize, DataTypes);
db.Lote = initLoteModel(sequelize, DataTypes);
db.TipoBaja = initTipoBajaModel(sequelize, DataTypes);
db.MaterialConsumption = initMaterialConsumptionModel(sequelize, DataTypes);
db.MaterialConsumptionItem = initMaterialConsumptionItemModel(sequelize, DataTypes);
db.ConsumptionOrder = initConsumptionOrderModel(sequelize, DataTypes);
db.ConsumptionOrderItem = initConsumptionOrderItemModel(sequelize, DataTypes);
db.WipInventory = initWipInventoryModel(sequelize, DataTypes);
db.SystemSetting = require('../../modules/telares/models/systemSetting.model')(sequelize, DataTypes);
db.WasteRequest = require('../../modules/warehouse/wasteRequest.model')(sequelize);

db.QrAreaAssignment = initQrAreaAssignmentModel(sequelize, DataTypes);
db.TraceableItem = initTraceableItemModel(sequelize, DataTypes);
db.TraceabilityMovement = initTraceabilityMovementModel(sequelize, DataTypes);
db.TraceabilityLink = initTraceabilityLinkModel(sequelize, DataTypes);

db.AuditLog = initAuditLogModel(sequelize, DataTypes);

db.ProcessFormula = initProcessFormulaModel(sequelize, DataTypes);
db.ProcessFormulaItem = initProcessFormulaItemModel(sequelize, DataTypes);
db.ProcessPreparation = initProcessPreparationModel(sequelize, DataTypes);
db.ProcessPreparationInput = initProcessPreparationInputModel(sequelize, DataTypes);

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

// Role -> Area
db.Role.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});
db.Area.hasMany(db.Role, {
  foreignKey: 'area_id',
  as: 'roles',
});

// Role -> Subarea
db.Role.belongsTo(db.Subarea, {
  foreignKey: 'subarea_id',
  as: 'subarea',
});
db.Subarea.hasMany(db.Role, {
  foreignKey: 'subarea_id',
  as: 'roles',
});

// Area -> Subarea
db.Subarea.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});
db.Area.hasMany(db.Subarea, {
  foreignKey: 'area_id',
  as: 'subareas',
});

// Area -> Location
db.Area.hasMany(db.Location, {
  foreignKey: 'area_id',
  as: 'locations',
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

['MaterialCode', 'MaterialFamily', 'MaterialBrand', 'MaterialType', 'Location', 'Material', 'MaterialUnit', 'WipInventory', 'Tag'].forEach(modelName => {
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

db.WasteRequest.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.WasteRequest.belongsTo(db.TipoBaja, {
  foreignKey: 'tipo_baja_id',
  as: 'tipoBaja',
});

db.WasteRequest.belongsTo(db.User, {
  foreignKey: 'requested_by',
  as: 'requester',
});

db.WasteRequest.belongsTo(db.User, {
  foreignKey: 'resolved_by',
  as: 'resolver',
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

db.InventoryMovement.belongsTo(db.Location, {
  foreignKey: 'from_location_id',
  as: 'fromLocation',
});

db.InventoryMovement.belongsTo(db.Area, { foreignKey: 'area_id', as: 'costArea' });
db.InventoryMovement.belongsTo(db.ConsumptionOrder, { foreignKey: 'consumption_order_id', as: 'consumptionOrder' });
db.InventoryMovement.belongsTo(db.ConsumptionOrderItem, { foreignKey: 'consumption_order_item_id', as: 'consumptionOrderItem' });
db.InventoryMovement.belongsTo(db.ProcessPreparation, { foreignKey: 'process_preparation_id', as: 'preparation' });

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

db.ConsumptionOrder.belongsTo(db.User, { foreignKey: 'requested_by', as: 'requester' });
db.ConsumptionOrder.belongsTo(db.User, { foreignKey: 'resolved_by', as: 'resolver' });
db.ConsumptionOrder.belongsTo(db.Area, { foreignKey: 'requesting_area_id', as: 'requesting_area' });
db.ConsumptionOrder.belongsTo(db.QrCode, { foreignKey: 'qr_code_id', as: 'qr_code' });
db.ConsumptionOrder.hasMany(db.ConsumptionOrderItem, { foreignKey: 'order_id', as: 'items' });

db.ConsumptionOrderItem.belongsTo(db.ConsumptionOrder, { foreignKey: 'order_id', as: 'order' });
db.ConsumptionOrderItem.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });
db.ConsumptionOrderItem.belongsTo(db.Lote, { foreignKey: 'lote_id', as: 'lote' });
db.ConsumptionOrderItem.belongsTo(db.MaterialUnit, { foreignKey: 'unit_id', as: 'unit' });
db.ConsumptionOrderItem.belongsTo(db.QrCode, { foreignKey: 'child_qr_id', as: 'child_qr' });
db.QrCode.hasOne(db.ConsumptionOrderItem, { foreignKey: 'child_qr_id', as: 'consumption_order_item' });

/* =========================
   NOTIFICATIONS & USERS
========================= */

db.Notification.belongsTo(db.User, {
  foreignKey: 'recipient_id',
  as: 'recipient',
});

db.Notification.belongsTo(db.User, {
  foreignKey: 'sender_id',
  as: 'sender',
});

db.User.hasMany(db.Notification, {
  foreignKey: 'recipient_id',
  as: 'notifications',
});

/* =========================
   PASSWORD RESETS
========================= */

db.PasswordReset.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

db.Supplier.hasMany(db.Lote, {
  foreignKey: 'supplier_id',
  as: 'lotes',
});
db.Lote.belongsTo(db.Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier',
});

/* =========================
   FORMULAS & MEZCLADO
========================= */

// Formula -> Items
db.ProcessFormula.hasMany(db.ProcessFormulaItem, {
  foreignKey: 'formula_id',
  as: 'items',
});
db.ProcessFormulaItem.belongsTo(db.ProcessFormula, {
  foreignKey: 'formula_id',
  as: 'formula',
});

// FormulaItem -> Material
db.ProcessFormulaItem.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

// Formula -> Target Area
db.ProcessFormula.belongsTo(db.Area, {
  foreignKey: 'target_area_id',
  as: 'target_area',
});

// ProcessPreparation -> Inputs
db.ProcessPreparation.belongsTo(db.ProcessFormula, {
  foreignKey: 'formula_id',
  as: 'formula',
});
db.ProcessPreparation.hasMany(db.ProcessPreparationInput, {
  foreignKey: 'preparation_id',
  as: 'inputs',
});
db.ProcessPreparationInput.belongsTo(db.ProcessPreparation, {
  foreignKey: 'preparation_id',
  as: 'preparation',
});
/* =========================
   EXTRUSION MODULE
========================= */
const initFormulaModel = require('../../modules/extrusion/models/formula.model');
const initFormulaIngredientModel = require('../../modules/extrusion/models/formulaIngredient.model');
const initPtiRackModel = require('../../modules/extrusion/models/ptiRack.model');
const initExtruderQueueModel = require('../../modules/extrusion/models/extruderQueue.model');
const initExtrusionScrapLogModel = require('../../modules/extrusion/models/extrusionScrapLog.model');
const initSiloModel = require('../../modules/extrusion/models/silo.model');
const initExtruderModel = require('../../modules/extrusion/models/extruder.model');
const initExtruderFormulaModel = require('../../modules/extrusion/models/extruderFormula.model');

db.Formula = initFormulaModel(sequelize, DataTypes);
db.FormulaIngredient = initFormulaIngredientModel(sequelize, DataTypes);
db.Formula_Ingredients = db.FormulaIngredient; // Alias for requirement compatibility
db.PtiRack = initPtiRackModel(sequelize, DataTypes);
db.ExtruderQueue = initExtruderQueueModel(sequelize, DataTypes);
db.ExtrusionScrapLog = initExtrusionScrapLogModel(sequelize, DataTypes);
db.ExtrusionTransition = require('../../modules/extrusion/models/extrusionTransition.model')(sequelize, DataTypes);
db.ExtrusionProductionEntry = require('../../modules/extrusion/models/extrusionProductionEntry.model')(sequelize, DataTypes);
db.ExtrusionScrapAdjustment = require('../../modules/extrusion/models/extrusionScrapAdjustment.model')(sequelize, DataTypes);
db.ExtrusionShiftClosure = require('../../modules/extrusion/models/extrusionShiftClosure.model')(sequelize, DataTypes);
db.ExtrusionProductionAdjustment = sequelize.define('ExtrusionProductionAdjustment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  production_entry_id: { type: DataTypes.INTEGER, allowNull: false },
  previous_pieces: { type: DataTypes.INTEGER, allowNull: false },
  corrected_pieces: { type: DataTypes.INTEGER, allowNull: false },
  previous_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  corrected_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  correction_reason: { type: DataTypes.TEXT, allowNull: false },
  corrected_by: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'extrusion_production_adjustments', timestamps: true, createdAt: true, updatedAt: false, underscored: true });
db.Silo = initSiloModel(sequelize, DataTypes);
db.Extruder = initExtruderModel(sequelize, DataTypes);
db.ExtruderFormula = initExtruderFormulaModel(sequelize, DataTypes);

// Silo -> Material
db.InventoryMovement.belongsTo(db.Silo, { foreignKey: 'silo_id', as: 'silo' });
db.Silo.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});
db.Silo.belongsTo(db.Tag, {
  foreignKey: 'material_tag_id',
  as: 'materialTag',
});

// Extruder <-> Formula (Compatibility Matrix)
db.Extruder.belongsToMany(db.Formula, {
  through: db.ExtruderFormula,
  foreignKey: 'extruder_id',
  otherKey: 'formula_id',
  as: 'allowedFormulas',
});
db.Formula.belongsToMany(db.Extruder, {
  through: db.ExtruderFormula,
  foreignKey: 'formula_id',
  otherKey: 'extruder_id',
  as: 'allowedExtrudersRel',
});

// Extruder -> Queues
db.Extruder.hasMany(db.ExtruderQueue, {
  foreignKey: 'extruder_id',
  as: 'queues',
});
db.ExtruderQueue.belongsTo(db.Extruder, {
  foreignKey: 'extruder_id',
  as: 'extruder',
});

// Formula -> Ingredients
db.Formula.hasMany(db.FormulaIngredient, {
  foreignKey: 'formula_id',
  as: 'ingredients',
});
db.FormulaIngredient.belongsTo(db.Formula, {
  foreignKey: 'formula_id',
  as: 'formula',
});

// FormulaIngredient -> Material
db.FormulaIngredient.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});
db.FormulaIngredient.belongsTo(db.Tag, {
  foreignKey: 'equivalence_tag_id',
  as: 'equivalenceTag',
});

// PtiRack -> Material (PTI Type)
db.PtiRack.belongsTo(db.Material, {
  foreignKey: 'current_pti_type_id',
  as: 'currentPtiType',
});

// ExtruderQueue -> Formula
db.ExtruderQueue.belongsTo(db.Formula, {
  foreignKey: 'formula_id',
  as: 'formula',
});

// ExtruderQueue -> ConsumptionOrder
db.ExtruderQueue.belongsTo(db.ConsumptionOrder, {
  foreignKey: 'consumption_order_id',
  as: 'consumptionOrder',
});

db.ExtruderQueue.belongsTo(db.ProcessPreparation, {
  foreignKey: 'process_preparation_id',
  as: 'preparation',
});
db.ProcessPreparation.hasMany(db.ExtruderQueue, {
  foreignKey: 'process_preparation_id',
  as: 'extrusionQueues',
});
db.ProcessPreparation.hasMany(db.ExtrusionProductionEntry, {
  foreignKey: 'process_preparation_id',
  as: 'productionEntries',
});
db.ExtrusionProductionEntry.belongsTo(db.ProcessPreparation, {
  foreignKey: 'process_preparation_id',
  as: 'preparation',
});
db.ExtrusionProductionEntry.belongsTo(db.ExtruderQueue, {
  foreignKey: 'queue_id',
  as: 'queue',
});
db.ExtruderQueue.hasMany(db.ExtrusionProductionEntry, {
  foreignKey: 'queue_id',
  as: 'productionEntries',
});
db.Extruder.hasMany(db.ExtrusionProductionEntry, {
  foreignKey: 'extruder_id',
  as: 'productionEntries',
});
db.ExtrusionProductionEntry.belongsTo(db.Extruder, {
  foreignKey: 'extruder_id',
  as: 'extruder',
});
db.PtiRack.hasMany(db.ExtrusionProductionEntry, {
  foreignKey: 'rack_id',
  as: 'productionEntries',
});
db.ExtrusionProductionEntry.belongsTo(db.PtiRack, {
  foreignKey: 'rack_id',
  as: 'rack',
});
db.ExtrusionProductionEntry.hasMany(db.ExtrusionProductionAdjustment, {
  foreignKey: 'production_entry_id',
  as: 'adjustments',
});
db.ExtrusionProductionAdjustment.belongsTo(db.ExtrusionProductionEntry, {
  foreignKey: 'production_entry_id',
  as: 'productionEntry',
});
db.Extruder.hasMany(db.ExtrusionTransition, { foreignKey: 'extruder_id', as: 'transitions' });
db.ExtrusionTransition.belongsTo(db.Extruder, { foreignKey: 'extruder_id', as: 'extruder' });
db.ExtrusionTransition.belongsTo(db.ExtruderQueue, { foreignKey: 'from_queue_id', as: 'fromQueue' });
db.ExtrusionTransition.belongsTo(db.ExtruderQueue, { foreignKey: 'to_queue_id', as: 'toQueue' });
db.Extruder.hasMany(db.ExtrusionShiftClosure, { foreignKey: 'extruder_id', as: 'shiftClosures' });
db.ExtrusionShiftClosure.belongsTo(db.Extruder, { foreignKey: 'extruder_id', as: 'extruder' });
db.PtiRack.belongsTo(db.Subarea, { foreignKey: 'destination_subarea_id', as: 'destinationSubarea' });
db.ExtrusionProductionEntry.belongsTo(db.Subarea, { foreignKey: 'destination_subarea_id', as: 'destinationSubarea' });
db.ExtrusionTransition.hasMany(db.ExtrusionScrapLog, {
  foreignKey: 'transition_id',
  as: 'scrapItems',
});
db.ExtrusionScrapLog.belongsTo(db.ExtrusionTransition, {
  foreignKey: 'transition_id',
  as: 'transition',
});
db.ExtrusionScrapLog.hasMany(db.ExtrusionScrapAdjustment, {
  foreignKey: 'scrap_log_id',
  as: 'adjustments',
});
db.ExtrusionScrapAdjustment.belongsTo(db.ExtrusionScrapLog, {
  foreignKey: 'scrap_log_id',
  as: 'scrap',
});

// ExtrusionScrapLog -> User
db.ExtrusionScrapLog.belongsTo(db.User, {
  foreignKey: 'logged_by',
  as: 'operator',
});

// =========================
// PTI PRODUCTS CATALOG
// =========================
const initPtiProductModel = require('../../modules/extrusion/models/ptiProduct.model');
db.PtiProduct = initPtiProductModel(sequelize, DataTypes);

// Formula -> PTI Products
db.Formula.hasMany(db.PtiProduct, {
  foreignKey: 'formula_id',
  as: 'ptiProducts',
});
db.PtiProduct.belongsTo(db.Formula, {
  foreignKey: 'formula_id',
  as: 'formula',
});

// PtiProduct -> Material (opcional)
db.PtiProduct.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.PtiProduct.hasMany(db.ExtrusionProductionEntry, {
  foreignKey: 'pti_product_id',
  as: 'productionEntries',
});
db.ExtrusionProductionEntry.belongsTo(db.PtiProduct, {
  foreignKey: 'pti_product_id',
  as: 'ptiProduct',
});

// PtiRack -> PtiProduct
db.PtiRack.belongsTo(db.PtiProduct, {
  foreignKey: 'current_pti_product_id',
  as: 'currentPtiProduct',
});

// ============================================
// TELARES, BOMS (RECETAS) Y QR VIAJERO MODELS
// ============================================
const initLoomModel = require('../../modules/telares/models/loom.model');
const initProductionBomModel = require('../../modules/telares/models/productionBom.model');
const initProductionBomItemModel = require('../../modules/telares/models/productionBomItem.model');
const initLoomRunModel = require('../../modules/telares/models/loomRun.model');
const initViajeroRollModel = require('../../modules/telares/models/viajeroRoll.model');
const initViajeroRollOperatorSegmentModel = require('../../modules/telares/models/viajeroRollOperatorSegment.model');
const initViajeroRoutingLogModel = require('../../modules/telares/models/viajeroRoutingLog.model');
const initLoomBackflushConsumptionModel = require('../../modules/telares/models/loomBackflushConsumption.model');

db.Loom = initLoomModel(sequelize, DataTypes);
db.LoomPtiWip = require('../../modules/telares/models/loomPtiWip.model')(sequelize, DataTypes);
db.Loom.belongsTo(db.Subarea, { foreignKey: 'subarea_id', as: 'subarea' });
db.Loom.hasMany(db.LoomPtiWip, { foreignKey: 'loom_id', as: 'ptiWipItems' });
db.LoomPtiWip.belongsTo(db.Loom, { foreignKey: 'loom_id', as: 'loom' });
db.LoomPtiWip.belongsTo(db.PtiProduct, { foreignKey: 'pti_product_id', as: 'ptiProduct' });
db.LoomPtiWip.belongsTo(db.PtiRack, { foreignKey: 'source_rack_id', as: 'sourceRack' });
db.LoomPtiWip.belongsTo(db.Subarea, { foreignKey: 'destination_subarea_id', as: 'destinationSubarea' });
db.ProductionBom = initProductionBomModel(sequelize, DataTypes);
db.ProductionBomItem = initProductionBomItemModel(sequelize, DataTypes);
db.ProductionBom.belongsTo(db.Subarea, { foreignKey: 'subarea_id', as: 'subarea' });
db.LoomRun = initLoomRunModel(sequelize, DataTypes);
db.ViajeroRoll = initViajeroRollModel(sequelize, DataTypes);
db.ViajeroRollOperatorSegment = initViajeroRollOperatorSegmentModel(sequelize, DataTypes);
db.ViajeroRoutingLog = initViajeroRoutingLogModel(sequelize, DataTypes);
db.LoomBackflushConsumption = initLoomBackflushConsumptionModel(sequelize, DataTypes);

// Loom Associations
db.Loom.belongsTo(db.PtiRack, { foreignKey: 'active_warp_rack_id', as: 'warpRack' });
db.Loom.belongsTo(db.PtiRack, { foreignKey: 'active_weft_rack_id', as: 'weftRack' });
db.Loom.belongsTo(db.ProductionBom, { foreignKey: 'current_bom_id', as: 'currentBom' });
db.Loom.hasMany(db.LoomRun, { foreignKey: 'loom_id', as: 'runs' });

// BOM Associations
db.ProductionBom.hasMany(db.ProductionBomItem, { foreignKey: 'bom_id', as: 'items' });
db.ProductionBomItem.belongsTo(db.ProductionBom, { foreignKey: 'bom_id', as: 'bom' });
db.ProductionBomItem.belongsTo(db.PtiProduct, { foreignKey: 'pti_product_id', as: 'ptiProduct' });
db.ProductionBomItem.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });

// LoomRun Associations
db.LoomRun.belongsTo(db.Loom, { foreignKey: 'loom_id', as: 'loom' });
db.LoomRun.belongsTo(db.ProductionBom, { foreignKey: 'bom_id', as: 'bom' });
db.LoomRun.belongsTo(db.User, { foreignKey: 'operator_id', as: 'operator' });
db.LoomRun.belongsTo(db.PtiRack, { foreignKey: 'warp_rack_id', as: 'warpRack' });
db.LoomRun.belongsTo(db.PtiRack, { foreignKey: 'weft_rack_id', as: 'weftRack' });
db.LoomRun.hasMany(db.ViajeroRoll, { foreignKey: 'run_id', as: 'rolls' });

// ViajeroRoll Associations
db.ViajeroRoll.belongsTo(db.LoomRun, { foreignKey: 'run_id', as: 'run' });
db.ViajeroRoll.belongsTo(db.Loom, { foreignKey: 'loom_id', as: 'loom' });
db.ViajeroRoll.belongsTo(db.ProductionBom, { foreignKey: 'bom_id', as: 'bom' });
db.ViajeroRoll.belongsTo(db.User, { foreignKey: 'operator_id', as: 'operator' });
db.ViajeroRoll.belongsTo(db.User, { foreignKey: 'shift_supervisor_id', as: 'shiftSupervisor' });
db.ViajeroRoll.hasMany(db.ViajeroRollOperatorSegment, { foreignKey: 'viajero_roll_id', as: 'operatorSegments' });
db.ViajeroRoll.hasMany(db.ViajeroRoutingLog, { foreignKey: 'viajero_roll_id', as: 'routingLogs' });
db.ViajeroRoll.hasMany(db.LoomBackflushConsumption, { foreignKey: 'viajero_roll_id', as: 'consumptions' });

// ViajeroRoutingLog Associations
db.ViajeroRoutingLog.belongsTo(db.ViajeroRoll, { foreignKey: 'viajero_roll_id', as: 'roll' });
db.ViajeroRoutingLog.belongsTo(db.User, { foreignKey: 'operator_id', as: 'operator' });
db.ViajeroRoutingLog.belongsTo(db.Area, { foreignKey: 'area_id', as: 'area' });

// LoomBackflushConsumption Associations
db.LoomBackflushConsumption.belongsTo(db.ViajeroRoll, { foreignKey: 'viajero_roll_id', as: 'roll' });
db.LoomBackflushConsumption.belongsTo(db.LoomRun, { foreignKey: 'loom_run_id', as: 'run' });
db.LoomBackflushConsumption.belongsTo(db.PtiRack, { foreignKey: 'rack_id', as: 'rack' });
db.LoomBackflushConsumption.belongsTo(db.PtiProduct, { foreignKey: 'pti_product_id', as: 'ptiProduct' });
db.LoomBackflushConsumption.belongsTo(db.LoomPtiWip, { foreignKey: 'source_loom_wip_item_id', as: 'sourceWipItem' });

db.ViajeroRollOperatorSegment.belongsTo(db.ViajeroRoll, { foreignKey: 'viajero_roll_id', as: 'roll' });
db.ViajeroRollOperatorSegment.belongsTo(db.User, { foreignKey: 'operator_id', as: 'operator' });
db.ViajeroRollOperatorSegment.belongsTo(db.User, { foreignKey: 'recorded_by', as: 'recordedBy' });

// Preparation input lineage associations. Keep these after all referenced models are initialized.
db.ProcessPreparationInput.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });
db.ProcessPreparationInput.belongsTo(db.Lote, { foreignKey: 'source_lote_id', as: 'sourceLot' });
db.ProcessPreparationInput.belongsTo(db.Silo, { foreignKey: 'source_silo_id', as: 'sourceSilo' });
db.ProcessPreparationInput.belongsTo(db.QrCode, { foreignKey: 'source_qr_code_id', as: 'sourceQrCode' });
db.ProcessPreparationInput.belongsTo(db.TraceableItem, { foreignKey: 'source_traceable_item_id', as: 'sourceTraceableItem' });

// ============================================
// GLOBO Y LAMINADO SPECIFICATIONS & CATALOGS
// ============================================
db.GloboSpecification = require('../../modules/globo/models/globoSpecification.model')(sequelize, DataTypes);
db.GloboSpecificationMaterial = require('../../modules/globo/models/globoSpecificationMaterial.model')(sequelize, DataTypes);
db.LaminadoSpecification = require('../../modules/laminado/models/laminadoSpecification.model')(sequelize, DataTypes);
db.LaminadoSpecificationMaterial = require('../../modules/laminado/models/laminadoSpecificationMaterial.model')(sequelize, DataTypes);

db.GloboSpecification.hasMany(db.GloboSpecificationMaterial, { foreignKey: 'globo_spec_id', as: 'materials' });
db.GloboSpecificationMaterial.belongsTo(db.GloboSpecification, { foreignKey: 'globo_spec_id', as: 'specification' });
db.GloboSpecificationMaterial.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });

db.LaminadoSpecification.hasMany(db.LaminadoSpecificationMaterial, { foreignKey: 'laminado_spec_id', as: 'materials' });
db.LaminadoSpecificationMaterial.belongsTo(db.LaminadoSpecification, { foreignKey: 'laminado_spec_id', as: 'specification' });
db.LaminadoSpecificationMaterial.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });

module.exports = db;

