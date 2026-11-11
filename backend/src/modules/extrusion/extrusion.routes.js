const express = require('express');
const extrusionController = require('./extrusion.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const permissionAuthorizer = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const authorizePermission = (...permissions) => (req, res, next) => {
  const roleCode = String(req.user?.role?.code || req.user?.role?.name || '').toUpperCase();
  if (['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION'].includes(roleCode)) return next();
  return permissionAuthorizer(...permissions)(req, res, next);
};
const authorizeSiloAdministration = roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN');
const authorizeSiloRead = roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN', 'ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION');

const FINANCIAL_FIELD = /cost|price|currency|financial|valuation|costo|precio|dinero/i;
const FINANCIAL_VALUE_FIELD = /^(value|total_extrusion_wip_value)$/i;
const FINANCIAL_VALUE_SUFFIX = /(?:^|_)value$/i;
const stripFinancialFields = (value, activePath = new WeakSet()) => {
  if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (activePath.has(value)) return null;

  activePath.add(value);
  let source = value;
  let sourceAdded = false;
  try {
    // Sequelize model instances expose internal references that are cyclic. Convert
    // them to their public JSON shape before walking fields for financial data.
    if (!Array.isArray(value) && typeof value.toJSON === 'function') {
      source = value.toJSON();
      if (source && typeof source === 'object' && source !== value) {
        if (activePath.has(source)) return null;
        activePath.add(source);
        sourceAdded = true;
      }
    }

    if (Array.isArray(source)) return source.map((child) => stripFinancialFields(child, activePath));
    if (!source || typeof source !== 'object') return source;

    return Object.fromEntries(Object.entries(source)
      .filter(([key]) => !FINANCIAL_FIELD.test(key) && !FINANCIAL_VALUE_FIELD.test(key) && !FINANCIAL_VALUE_SUFFIX.test(key))
      .map(([key, child]) => [key, stripFinancialFields(child, activePath)]));
  } finally {
    if (sourceAdded) activePath.delete(source);
    activePath.delete(value);
  }
};

const requireFormulaIngredientEditor = (req, res, next) => {
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'ingredients')) return next();
  const roleCode = (req.user?.role?.code || req.user?.role?.name || (typeof req.user?.role === 'string' ? req.user.role : '')).toUpperCase();
  const allowedRoles = ['ADMIN_EXT', 'ADMIN_EXTRUSION', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'SUPERADMIN'];
  if (allowedRoles.includes(roleCode)) return next();
  return res.status(403).json({
    success: false,
    message: 'Solo Admin de Extrusión, Admin y Superadmin pueden modificar los ingredientes de una fórmula.'
  });
};

// Control de acceso: Superadmin, Admin General o roles operativos de extrusión
const requireExtrusionAccess = (req, res, next) => {
  const roleCode = (req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '')).toUpperCase();
  const executiveRoles = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'];
  const allowedRoles = ['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION', 'OPERADOR_EXTRUSION'];
  const telaresCatalogRoles = ['ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES'];
  // Telares needs the read-only Extrusion PTI catalog to define its BOM inputs.
  // Keep this exception limited to the list endpoint; no other Extrusion route is opened.
  if (req.method === 'GET' && req.path === '/pti-products' && telaresCatalogRoles.includes(roleCode)) return next();
  const otherAreaRoles = [
    'ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN', 'ADMIN_TELARES', 'ADMIN_TEL',
    'SUPERVISOR_TELARES', 'OPERADOR_TELARES', 'ADMIN_GLOBO', 'SUPERVISOR_GLOBO',
    'OPERADOR_GLOBO', 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO',
  ];
  if (executiveRoles.includes(roleCode)) return next();
  if (!otherAreaRoles.includes(roleCode) && allowedRoles.includes(roleCode)) return next();
  return res.status(403).json({
    success: false,
    message: 'Acceso restringido al personal autorizado de Extrusión.'
  });
};

const requireExtrusionFinancialAccess = (req, res, next) => {
  const roleCode = String(req.user?.role?.code || req.user?.role?.name || '').toUpperCase();
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Acceso financiero restringido a administración autorizada de Extrusión.' });
};

router.use(authenticate);
router.use(requireExtrusionAccess);
router.use((req, res, next) => {
  const roleCode = String(req.user?.role?.code || req.user?.role?.name || '').toUpperCase();
  if (roleCode !== 'SUPERVISOR_EXTRUSION') return next();

  req.body = stripFinancialFields(req.body || {});
  const json = res.json.bind(res);
  res.json = (payload) => json(stripFinancialFields(payload));
  next();
});

const requireActiveShift = ({ allowExpired = false } = {}) => async (req, res, next) => {
  try {
    const { ExtrusionShiftSession } = require('../../database/models');
    const session = await ExtrusionShiftSession.findOne({ where: { status: 'ABIERTO' }, order: [['opened_at', 'DESC']] });
    if (!session) return res.status(409).json({ success: false, code: 'EXTRUSION_SHIFT_REQUIRED', message: 'No hay turno de Extrusión abierto. El supervisor responsable debe iniciarlo antes de operar.' });
    const roleCode = String(req.user?.role?.code || req.user?.role?.name || req.user?.role || '').toUpperCase();
    if (roleCode === 'SUPERVISOR_EXTRUSION' && Number(session.supervisor_id) !== Number(req.user?.id)) {
      return res.status(403).json({ success: false, code: 'EXTRUSION_SHIFT_OWNER_MISMATCH', message: 'El turno está a cargo de otro supervisor de Extrusión.' });
    }
    if (session.handoff_ready_at) {
      return res.status(409).json({ success: false, code: 'EXTRUSION_SHIFT_HANDOFF_PENDING', message: 'El turno está listo para relevo. Espera a que el supervisor entrante confirme la recepción antes de registrar nuevas operaciones.' });
    }
    const { isExtrusionShiftExpired } = require('./services/shiftPolicy');
    if (!allowExpired && isExtrusionShiftExpired(session.opened_at)) {
      return res.status(409).json({ success: false, code: 'EXTRUSION_SHIFT_EXPIRED', message: 'El turno superó las 12 horas. El supervisor debe completar el cierre; la custodia de racks se mantiene hasta confirmarlo.' });
    }
    req.extrusionShiftSession = session;
    req.body = { ...(req.body || {}), shift_code: session.shift_code, shift_session_id: session.id };
    next();
  } catch (error) { next(error); }
};

// Formulas
router.get('/formulas', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getFormulas);
router.get('/formulas/:id', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getFormulaDetails);
router.get('/wip-child-qr/:qrCode', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getWipChildQr);
router.post('/wip/qr-labels/pdf', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.downloadWipQrLabelsPdf);

router.post('/mix', requireActiveShift(), authorizePermission('extrusion.formulas.manage'), extrusionController.mixFormula);
router.get('/mix-drafts', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getPausedMixDrafts);
router.post('/mix-drafts', requireActiveShift(), authorizePermission('extrusion.formulas.manage'), extrusionController.saveMixDraft);
router.delete('/mix-drafts/:id', authorizePermission('extrusion.formulas.manage'), extrusionController.discardMixDraft);
router.get('/mix-history', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getPreparedMixHistory);
router.get('/mix/containers/:identifier', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getMixContainersByQrOrFolio);
router.post('/mix-requests', requireActiveShift(), authorizePermission('extrusion.formulas.manage'), extrusionController.createMixRequest);
router.get('/mix-requests', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getMixRequests);

// ==========================================
// PISO DE EXTRUSIÓN & CONTROL DE COLAS & SCRAP
// ==========================================
router.post('/queue/switch', requireActiveShift(), extrusionController.switchQueue);
router.post('/rack/scan', requireActiveShift(), extrusionController.scanRack);
router.get('/queue', extrusionController.getQueues);
router.get('/purge-materials', extrusionController.getPurgeMaterials);
router.get('/purge-materials/:materialId/lotes', extrusionController.getPurgeMaterialLots);
router.post('/queue/enqueue', requireActiveShift(), extrusionController.enqueueMix);
router.get('/racks', extrusionController.getRacks);
router.post('/racks', extrusionController.createRack);
// Piso de formulas y edicion de indice de multiplicacion
router.get('/floor-formulas', extrusionController.getExtrusionFormulas);
router.post('/floor-formulas', authorizePermission('extrusion.formulas.manage'), extrusionController.createFormula);
router.get('/floor-formulas/:id', extrusionController.getFormulaById);
router.put('/floor-formulas/:id', requireFormulaIngredientEditor, extrusionController.updateFormula);
router.put('/formulas/:id', requireFormulaIngredientEditor, extrusionController.updateFormula);

// Catalogo de PTI (Carretes / Bobinas Salientes)
router.get('/pti-products', extrusionController.getPtiProducts);
router.get('/pti-products/:id', extrusionController.getPtiProductById);
router.post('/pti-products', authorizePermission('extrusion.formulas.manage'), extrusionController.createPtiProduct);
router.put('/pti-products/:id', authorizePermission('extrusion.formulas.manage'), extrusionController.updatePtiProduct);
router.delete('/pti-products/:id', authorizePermission('extrusion.formulas.manage'), extrusionController.deletePtiProduct);

// Merma / Scrap y Balance de Masa
router.post('/scrap', requireActiveShift({ allowExpired: true }), extrusionController.registerScrap);
router.get('/scrap-logs', extrusionController.getScrapLogs);
router.get('/dashboard/metrics', extrusionController.getExtrusionDashboardMetrics);
router.patch('/scrap/:id/weigh', requireActiveShift({ allowExpired: true }), extrusionController.adjustScrapWeight);
router.get('/shifts/activity', extrusionController.getExtrusionShiftActivity);
router.get('/shifts/report', extrusionController.getExtrusionShiftReport);
router.get('/shifts/session/active', extrusionController.getActiveExtrusionShiftSession);
router.post('/shifts/session/entry', extrusionController.getExtrusionShiftEntryState);
router.post('/shifts/session/open', extrusionController.openExtrusionShiftSession);
router.post('/shifts/session/:id/close', extrusionController.closeExtrusionShiftSession);
router.post('/shifts/close', requireActiveShift({ allowExpired: true }), extrusionController.closeExtrusionShift);
router.patch('/production/:id', requireActiveShift(), extrusionController.adjustProductionEntry);
router.get('/mass-balance/:mixQr', extrusionController.getMassBalance);
router.get('/wip/inventory', extrusionController.getExtrusionWip);
router.post('/wip/mixtures/:id/scrap', requireActiveShift({ allowExpired: true }), authorizePermission('scrap.create', 'scrap.manage'), extrusionController.scrapWipMixture);

// Precios de Rack / PTI y Valorización (Puntos 3, 5, 6, 7)
router.put('/racks/:id/price', requireExtrusionFinancialAccess, extrusionController.updatePtiRackPrice);
router.get('/valuation', requireExtrusionFinancialAccess, extrusionController.getExtrusionValuation);

// División de contenedores y transiciones espontáneas (Puntos 2, 4)
router.post('/mix/split-containers', requireActiveShift(), extrusionController.splitMixtureContainers);
router.post('/mixture-transition', requireActiveShift(), extrusionController.recordMixtureTransition);

// ==========================================
// CATÁLOGO DE MÁQUINAS (EXTRUSORAS)
// ==========================================
router.get('/machines', extrusionController.getMachines);
router.post('/machines', authorizePermission('extrusion.runs.manage'), extrusionController.createMachine);
router.put('/machines/:id', authorizePermission('extrusion.runs.manage'), extrusionController.updateMachine);
router.put('/machines/:id/formulas', authorizePermission('extrusion.runs.manage'), extrusionController.updateMachineFormulaCompatibility);
router.get('/silos', authorizeSiloRead, extrusionController.getSilos);
router.post('/silos', authorizeSiloAdministration, extrusionController.createSilo);
router.put('/silos/:id', authorizeSiloAdministration, extrusionController.updateSilo);
router.delete('/silos/:id', authorizeSiloAdministration, extrusionController.deleteSilo);
router.post('/silos/invoice-entry', authorizeSiloAdministration, extrusionController.receiveSiloInvoiceEntry);

module.exports = router;

