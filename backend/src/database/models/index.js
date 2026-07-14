const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const initRoleModel = require('../../modules/roles/role.model');
const initPermissionModel = require('../../modules/permissions/permission.model');
const initAreaModel = require('../../modules/areas/area.model');
const initUserModel = require('../../modules/users/user.model');

const initQrBatchModel = require('../../modules/qrcodes/qrBatch.model');
const initQrCodeModel = require('../../modules/qrcodes/qrCode.model');
const initQrEventModel = require('../../modules/qrcodes/qrEvent.model');

const initMaterialCategoryModel = require('../../modules/materials/materialCategory.model');
const initMaterialModel = require('../../modules/materials/material.model');

const initMaterialStockModel = require('../../modules/materialInventory/materialStock.model');
const initMaterialLotModel = require('../../modules/materialInventory/materialLot.model');
const initMaterialStockMovementModel = require('../../modules/materialInventory/materialStockMovement.model');

const initQrAreaAssignmentModel = require('../../modules/traceability/qrAreaAssignment.model');
const initTraceableItemModel = require('../../modules/traceability/traceableItem.model');
const initTraceabilityMovementModel = require('../../modules/traceability/traceabilityMovement.model');
const initTraceabilityLinkModel = require('../../modules/traceability/traceabilityLink.model');

const initProcessFormulaModel = require('../../modules/formulas/processFormula.model');
const initProcessFormulaItemModel = require('../../modules/formulas/processFormulaItem.model');
const initAuditLogModel = require('../../modules/audit/auditLog.model');

const initProcessPreparationModel = require('../../modules/formulas/processPreparation.model');
const initProcessPreparationInputModel = require('../../modules/formulas/processPreparationInput.model');

const initProcessRunModel = require('../../modules/processes/processRun.model');
const initProcessRunInputModel = require('../../modules/processes/processRunInput.model');

const initIntermediateMaterialModel = require('../../modules/intermediate/intermediateMaterial.model');
const initStorageRackModel = require('../../modules/intermediate/storageRack.model');
const initIntermediateStockModel = require('../../modules/intermediate/intermediateStock.model');
const initProcessRunOutputModel = require('../../modules/processes/processRunOutput.model');
const initIntermediateStockMovementModel = require('../../modules/intermediate/intermediateStockMovement.model');

const initScrapCatalogModel = require('../../modules/scrap/scrapCatalog.model');
const initScrapMovementModel = require('../../modules/scrap/scrapMovement.model');
const initScrapContainerModel = require('../../modules/scrap/scrapContainer.model');
const initScrapContainerStockModel = require('../../modules/scrap/scrapContainerStock.model');
const initScrapStockMovementModel = require('../../modules/scrap/scrapStockMovement.model');

const initProcessOutputItemModel = require('../../modules/processes/processOutputItem.model');

const db = {};

db.sequelize = sequelize;

db.Role = initRoleModel(sequelize);
db.Permission = initPermissionModel(sequelize);
db.Area = initAreaModel(sequelize);
db.User = initUserModel(sequelize);

db.QrBatch = initQrBatchModel(sequelize, DataTypes);
db.QrCode = initQrCodeModel(sequelize, DataTypes);
db.QrEvent = initQrEventModel(sequelize, DataTypes);

db.MaterialCategory = initMaterialCategoryModel(sequelize, DataTypes);
db.Material = initMaterialModel(sequelize, DataTypes);

db.MaterialStock = initMaterialStockModel(sequelize, DataTypes);
db.MaterialLot = initMaterialLotModel(sequelize, DataTypes);
db.MaterialStockMovement = initMaterialStockMovementModel(sequelize, DataTypes);

db.QrAreaAssignment = initQrAreaAssignmentModel(sequelize, DataTypes);
db.TraceableItem = initTraceableItemModel(sequelize, DataTypes);
db.TraceabilityMovement = initTraceabilityMovementModel(sequelize, DataTypes);
db.TraceabilityLink = initTraceabilityLinkModel(sequelize, DataTypes);

db.ProcessFormula = initProcessFormulaModel(sequelize, DataTypes);
db.ProcessFormulaItem = initProcessFormulaItemModel(sequelize, DataTypes);
db.AuditLog = initAuditLogModel(sequelize, DataTypes);

db.ProcessPreparation = initProcessPreparationModel(sequelize, DataTypes);
db.ProcessPreparationInput = initProcessPreparationInputModel(sequelize, DataTypes);

db.ProcessRun = initProcessRunModel(sequelize, DataTypes);
db.ProcessRunInput = initProcessRunInputModel(sequelize, DataTypes);

db.IntermediateMaterial = initIntermediateMaterialModel(sequelize, DataTypes);
db.StorageRack = initStorageRackModel(sequelize, DataTypes);
db.IntermediateStock = initIntermediateStockModel(sequelize, DataTypes);
db.ProcessRunOutput = initProcessRunOutputModel(sequelize, DataTypes);

db.ScrapCatalog = initScrapCatalogModel(sequelize, DataTypes);
db.ScrapMovement = initScrapMovementModel(sequelize, DataTypes);
db.ScrapStockMovement = initScrapStockMovementModel(sequelize, DataTypes);
db.ScrapContainer = initScrapContainerModel(sequelize, DataTypes);
db.ScrapContainerStock = initScrapContainerStockModel(sequelize, DataTypes);

db.ProcessOutputItem = initProcessOutputItemModel(sequelize, DataTypes);
db.IntermediateStockMovement = initIntermediateStockMovementModel(sequelize, DataTypes);

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

db.QrCode.belongsTo(db.Area, {
  foreignKey: 'current_area_id',
  as: 'currentArea',
});

db.QrCode.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.QrCode.belongsTo(db.User, {
  foreignKey: 'assigned_by',
  as: 'assignedByUser',
});

db.QrCode.belongsTo(db.User, {
  foreignKey: 'used_by',
  as: 'usedByUser',
});

db.QrCode.belongsTo(db.User, {
  foreignKey: 'cancelled_by',
  as: 'cancelledByUser',
});

db.QrCode.hasMany(db.QrEvent, {
  foreignKey: 'qr_code_id',
  as: 'events',
});

/**
 * QR EVENT RELATIONS
 */

db.QrEvent.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qrCode',
});

db.QrEvent.belongsTo(db.User, {
  foreignKey: 'performed_by',
  as: 'performedByUser',
});

db.QrEvent.belongsTo(db.Area, {
  foreignKey: 'from_area_id',
  as: 'fromArea',
});

db.QrEvent.belongsTo(db.Area, {
  foreignKey: 'to_area_id',
  as: 'toArea',
});

db.MaterialCategory.hasMany(db.Material, {
  foreignKey: 'material_category_id',
  as: 'materials',
});

db.Material.belongsTo(db.MaterialCategory, {
  foreignKey: 'material_category_id',
  as: 'category',
});

db.MaterialCategory.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.MaterialCategory.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

db.Material.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.Material.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

db.Material.hasOne(db.MaterialStock, {
  foreignKey: 'material_id',
  as: 'stock',
});

db.MaterialStock.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.Material.hasMany(db.MaterialLot, {
  foreignKey: 'material_id',
  as: 'lots',
});

db.MaterialLot.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.Material.hasMany(db.MaterialStockMovement, {
  foreignKey: 'material_id',
  as: 'stock_movements',
});

db.MaterialStockMovement.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.MaterialLot.hasMany(db.MaterialStockMovement, {
  foreignKey: 'material_lot_id',
  as: 'movements',
});

db.MaterialStockMovement.belongsTo(db.MaterialLot, {
  foreignKey: 'material_lot_id',
  as: 'lot',
});

db.MaterialStock.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.MaterialStock.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

db.MaterialLot.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

db.MaterialLot.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

db.MaterialStockMovement.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator',
});

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

// Process formulas
db.ProcessFormula.belongsTo(db.Area, {
  foreignKey: 'target_area_id',
  as: 'target_area',
});

db.Area.hasMany(db.ProcessFormula, {
  foreignKey: 'target_area_id',
  as: 'process_formulas',
});

db.ProcessFormula.hasMany(db.ProcessFormulaItem, {
  foreignKey: 'formula_id',
  as: 'items',
});

db.ProcessFormulaItem.belongsTo(db.ProcessFormula, {
  foreignKey: 'formula_id',
  as: 'formula',
});

db.ProcessFormulaItem.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

db.Material.hasMany(db.ProcessFormulaItem, {
  foreignKey: 'material_id',
  as: 'formula_items',
});

// Audit logs
db.AuditLog.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user',
});

db.User.hasMany(db.AuditLog, {
  foreignKey: 'user_id',
  as: 'audit_logs',
});

// Process preparations
db.ProcessPreparation.belongsTo(db.ProcessFormula, {
  foreignKey: 'formula_id',
  as: 'formula',
});

db.ProcessFormula.hasMany(db.ProcessPreparation, {
  foreignKey: 'formula_id',
  as: 'preparations',
});

db.ProcessPreparation.belongsTo(db.Area, {
  foreignKey: 'from_area_id',
  as: 'from_area',
});

db.ProcessPreparation.belongsTo(db.Area, {
  foreignKey: 'to_area_id',
  as: 'to_area',
});

db.ProcessPreparation.belongsTo(db.QrCode, {
  foreignKey: 'destination_qr_code_id',
  as: 'destination_qr_code',
});

db.ProcessPreparation.belongsTo(db.TraceableItem, {
  foreignKey: 'destination_traceable_item_id',
  as: 'destination_traceable_item',
});

db.ProcessPreparation.hasMany(db.ProcessPreparationInput, {
  foreignKey: 'preparation_id',
  as: 'inputs',
});

db.ProcessPreparationInput.belongsTo(db.ProcessPreparation, {
  foreignKey: 'preparation_id',
  as: 'preparation',
});

db.ProcessPreparationInput.belongsTo(db.ProcessFormulaItem, {
  foreignKey: 'formula_item_id',
  as: 'formula_item',
});

db.ProcessPreparationInput.belongsTo(db.TraceableItem, {
  foreignKey: 'source_traceable_item_id',
  as: 'source_traceable_item',
});

db.ProcessPreparationInput.belongsTo(db.QrCode, {
  foreignKey: 'source_qr_code_id',
  as: 'source_qr_code',
});

db.ProcessPreparationInput.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

// Process runs
db.ProcessRun.belongsTo(db.Area, {
  foreignKey: 'process_area_id',
  as: 'process_area',
});

db.Area.hasMany(db.ProcessRun, {
  foreignKey: 'process_area_id',
  as: 'process_runs',
});

db.ProcessRun.belongsTo(db.TraceableItem, {
  foreignKey: 'source_traceable_item_id',
  as: 'source_traceable_item',
});

db.ProcessRun.belongsTo(db.QrCode, {
  foreignKey: 'source_qr_code_id',
  as: 'source_qr_code',
});

db.ProcessRun.hasMany(db.ProcessRunInput, {
  foreignKey: 'process_run_id',
  as: 'inputs',
});

db.ProcessRunInput.belongsTo(db.ProcessRun, {
  foreignKey: 'process_run_id',
  as: 'process_run',
});

db.ProcessRunInput.belongsTo(db.TraceableItem, {
  foreignKey: 'traceable_item_id',
  as: 'traceable_item',
});

db.ProcessRunInput.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qr_code',
});

db.ProcessRunInput.belongsTo(db.Material, {
  foreignKey: 'material_id',
  as: 'material',
});

// Intermediate materials
db.IntermediateMaterial.belongsTo(db.Area, {
  foreignKey: 'production_area_id',
  as: 'production_area',
});

db.Area.hasMany(db.IntermediateMaterial, {
  foreignKey: 'production_area_id',
  as: 'intermediate_materials',
});

db.IntermediateMaterial.belongsTo(db.Material, {
  foreignKey: 'base_material_id',
  as: 'base_material',
});

db.Material.hasMany(db.IntermediateMaterial, {
  foreignKey: 'base_material_id',
  as: 'derived_intermediate_materials',
});

// Storage racks
db.StorageRack.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});

db.Area.hasMany(db.StorageRack, {
  foreignKey: 'area_id',
  as: 'storage_racks',
});

db.StorageRack.belongsTo(db.QrCode, {
  foreignKey: 'qr_code_id',
  as: 'qr_code',
});

db.QrCode.hasOne(db.StorageRack, {
  foreignKey: 'qr_code_id',
  as: 'storage_rack',
});

// Intermediate stocks
db.IntermediateStock.belongsTo(db.IntermediateMaterial, {
  foreignKey: 'intermediate_material_id',
  as: 'intermediate_material',
});

db.IntermediateMaterial.hasMany(db.IntermediateStock, {
  foreignKey: 'intermediate_material_id',
  as: 'stocks',
});

db.IntermediateStock.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});

db.Area.hasMany(db.IntermediateStock, {
  foreignKey: 'area_id',
  as: 'intermediate_stocks',
});

db.IntermediateStock.belongsTo(db.StorageRack, {
  foreignKey: 'rack_id',
  as: 'rack',
});

db.StorageRack.hasMany(db.IntermediateStock, {
  foreignKey: 'rack_id',
  as: 'intermediate_stocks',
});

// Process run outputs
db.ProcessRun.hasMany(db.ProcessRunOutput, {
  foreignKey: 'process_run_id',
  as: 'outputs',
});

db.ProcessRunOutput.belongsTo(db.ProcessRun, {
  foreignKey: 'process_run_id',
  as: 'process_run',
});

db.ProcessRunOutput.belongsTo(db.TraceableItem, {
  foreignKey: 'source_traceable_item_id',
  as: 'source_traceable_item',
});

db.ProcessRunOutput.belongsTo(db.QrCode, {
  foreignKey: 'source_qr_code_id',
  as: 'source_qr_code',
});

db.ProcessRunOutput.belongsTo(db.IntermediateMaterial, {
  foreignKey: 'intermediate_material_id',
  as: 'intermediate_material',
});

db.IntermediateMaterial.hasMany(db.ProcessRunOutput, {
  foreignKey: 'intermediate_material_id',
  as: 'process_outputs',
});

db.ProcessRunOutput.belongsTo(db.StorageRack, {
  foreignKey: 'rack_id',
  as: 'rack',
});

db.StorageRack.hasMany(db.ProcessRunOutput, {
  foreignKey: 'rack_id',
  as: 'process_outputs',
});

db.ProcessRunOutput.belongsTo(db.IntermediateStock, {
  foreignKey: 'intermediate_stock_id',
  as: 'intermediate_stock',
});

db.IntermediateStock.hasMany(db.ProcessRunOutput, {
  foreignKey: 'intermediate_stock_id',
  as: 'process_outputs',
});

// Intermediate stock movements
db.IntermediateStock.hasMany(db.IntermediateStockMovement, {
  foreignKey: 'intermediate_stock_id',
  as: 'movements',
});

db.IntermediateStockMovement.belongsTo(db.IntermediateStock, {
  foreignKey: 'intermediate_stock_id',
  as: 'intermediate_stock',
});

db.IntermediateStockMovement.belongsTo(db.IntermediateMaterial, {
  foreignKey: 'intermediate_material_id',
  as: 'intermediate_material',
});

db.IntermediateStockMovement.belongsTo(db.Area, {
  foreignKey: 'area_id',
  as: 'area',
});

db.IntermediateStockMovement.belongsTo(db.StorageRack, {
  foreignKey: 'rack_id',
  as: 'rack',
});

// Process output items
db.ProcessRunOutput.hasMany(db.ProcessOutputItem, {
  foreignKey: 'process_run_output_id',
  as: 'items',
});

db.ProcessOutputItem.belongsTo(db.ProcessRunOutput, {
  foreignKey: 'process_run_output_id',
  as: 'process_output',
});

// Scrap catalog
db.ProcessRunOutput.belongsTo(db.ScrapCatalog, {
  foreignKey: 'scrap_catalog_id',
  as: 'scrap_type',
});

db.ScrapCatalog.hasMany(db.ProcessRunOutput, {
  foreignKey: 'scrap_catalog_id',
  as: 'process_outputs',
});

// Scrap movements
db.ScrapCatalog.hasMany(db.ScrapContainer, {
  foreignKey: 'scrap_catalog_id',
  as: 'containers',
});

db.ScrapContainer.belongsTo(db.ScrapCatalog, {
  foreignKey: 'scrap_catalog_id',
  as: 'scrap_type',
});

db.StorageRack.hasMany(db.ScrapContainer, {
  foreignKey: 'rack_id',
  as: 'scrap_containers',
});

db.ScrapContainer.belongsTo(db.StorageRack, {
  foreignKey: 'rack_id',
  as: 'rack',
});

db.ScrapContainer.hasMany(db.ScrapMovement, {
  foreignKey: 'container_id',
  as: 'movements',
});

db.ScrapMovement.belongsTo(db.ScrapContainer, {
  foreignKey: 'container_id',
  as: 'container',
});

db.ScrapContainer.hasOne(db.ScrapContainerStock, {
  foreignKey: 'container_id',
  as: 'stock',
});

db.ScrapContainerStock.belongsTo(db.ScrapContainer, {
  foreignKey: 'container_id',
  as: 'container',
});

module.exports = db;