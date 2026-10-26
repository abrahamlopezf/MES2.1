const telaresService = require('./telares.service');
const { isAdmin, getUserAreaCode } = require('../../shared/security/accessRules');

exports.lookupPtiRack = async (req, res, next) => {
  try {
    const areaCode = getUserAreaCode(req.user);
    if (!isAdmin(req.user) && !['EXTRUSION', 'TELARES'].includes(areaCode)) {
      return res.status(403).json({ success: false, message: 'El QR de rack solo puede procesarse desde Extrusión o Telares.' });
    }
    const rack = await telaresService.getPtiRackByCode(req.params.code);
    if (!rack) return res.status(404).json({ success: false, message: 'El QR no corresponde a un rack registrado.' });
    res.json({ success: true, data: rack });
  } catch (err) {
    next(err);
  }
};

exports.getAvailablePtiRacks = async (req, res, next) => {
  try {
    const areaCode = getUserAreaCode(req.user);
    if (!isAdmin(req.user) && !['EXTRUSION', 'TELARES'].includes(areaCode)) {
      return res.status(403).json({ success: false, message: 'El inventario de PTI de Extrusión solo está disponible para Extrusión y Telares.' });
    }
    res.json({ success: true, data: await telaresService.getAvailablePtiRacks() });
  } catch (err) {
    next(err);
  }
};

exports.getLooms = async (req, res, next) => {
  try {
    const looms = await telaresService.getLooms(req.query.all === 'true');
    res.json(looms);
  } catch (err) {
    next(err);
  }
};

exports.getSubareas = async (req, res, next) => {
  try { res.json(await telaresService.getSubareas()); } catch (err) { next(err); }
};

exports.getBoms = async (req, res, next) => {
  try {
    const boms = await telaresService.getBoms(req.query.all === 'true');
    res.json(boms);
  } catch (err) {
    next(err);
  }
};

exports.createLoom = async (req, res, next) => {
  try { res.status(201).json(await telaresService.saveLoom(req.body)); } catch (err) { next(err); }
};

exports.updateLoom = async (req, res, next) => {
  try { res.json(await telaresService.saveLoom(req.body, Number(req.params.id))); } catch (err) { next(err); }
};

exports.deleteLoom = async (req, res, next) => {
  try { res.json(await telaresService.deactivateLoom(Number(req.params.id))); } catch (err) { next(err); }
};

exports.createBom = async (req, res, next) => {
  try { res.status(201).json(await telaresService.saveBom(req.body, null, req.user)); } catch (err) { next(err); }
};

exports.updateBom = async (req, res, next) => {
  try { res.json(await telaresService.saveBom(req.body, Number(req.params.id), req.user)); } catch (err) { next(err); }
};

exports.deleteBom = async (req, res, next) => {
  try { res.json(await telaresService.deactivateBom(Number(req.params.id))); } catch (err) { next(err); }
};

exports.assignRack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rack_id, role } = req.body;
    const operator_id = req.user?.id;
    const result = await telaresService.assignRackToLoom({
      loom_id: Number(id),
      rack_id: Number(rack_id),
      role: role || 'AMBOS',
      operator_id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.startRun = async (req, res, next) => {
  try {
    const { loom_id, bom_id, shift, meters_planned, weight_planned_kg, notes } = req.body;
    const operator_id = req.user?.id;
    const run = await telaresService.startLoomRun({
      loom_id: Number(loom_id),
      bom_id: Number(bom_id),
      operator_id,
      shift,
      meters_planned: Number(meters_planned || 1500),
      weight_planned_kg: Number(weight_planned_kg || 0) || null,
      notes,
    });
    res.status(201).json(run);
  } catch (err) {
    next(err);
  }
};

exports.getOperators = async (req, res, next) => {
  try {
    const includeInactive = req.query.all === 'true';
    res.json(await telaresService.getTejidoOperators(includeInactive));
  } catch (err) {
    next(err);
  }
};

exports.createOperator = async (req, res, next) => {
  try {
    const operator = await telaresService.createTejidoOperator(req.body);
    res.status(201).json(operator);
  } catch (err) {
    next(err);
  }
};

exports.updateOperator = async (req, res, next) => {
  try {
    const operator = await telaresService.updateTejidoOperator(Number(req.params.id), req.body);
    res.json(operator);
  } catch (err) {
    next(err);
  }
};

exports.deleteOperator = async (req, res, next) => {
  try {
    const result = await telaresService.deleteTejidoOperator(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.loadCreel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rack_id, spools_to_load } = req.body;
    const operator_id = req.user?.id;
    const result = await telaresService.loadLoomCreel({
      loom_id: Number(id),
      rack_id: Number(rack_id),
      spools_to_load: Number(spools_to_load),
      operator_id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.finishRoll = async (req, res, next) => {
  try {
    const { run_id, meters, weight_kg, custom_route, notes, shift_number, operator_nomina, shift_supervisor_id, operator_segments } = req.body;
    const recorded_by = req.user?.id;
    const operator_id = Number(operator_segments?.[0]?.operator_id) || recorded_by;
    const result = await telaresService.finishRollAndBackflush({
      run_id: Number(run_id),
      meters: Number(meters),
      weight_kg: Number(weight_kg),
      operator_id,
      custom_route,
      notes,
      shift_number,
      operator_nomina,
      shift_supervisor_id,
      operator_segments,
      recorded_by,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.validateViajeroScan = async (req, res, next) => {
  try {
    const { qr_code, area_name } = req.body;
    const operator_id = req.user?.id;
    const result = await telaresService.validateViajeroScan({
      qr_code,
      area_name,
      operator_id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.processViajeroStage = async (req, res, next) => {
  try {
    const { qr_code, target_stage, meters_in, meters_out, weight_in_kg, weight_out_kg, notes } = req.body;
    const operator_id = req.user?.id;
    const result = await telaresService.processViajeroStage({
      qr_code,
      target_stage,
      operator_id,
      meters_in: meters_in ? Number(meters_in) : null,
      meters_out: meters_out ? Number(meters_out) : null,
      weight_in_kg: weight_in_kg ? Number(weight_in_kg) : null,
      weight_out_kg: weight_out_kg ? Number(weight_out_kg) : null,
      notes,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getViajeroDetails = async (req, res, next) => {
  try {
    const { qr_code } = req.params;
    const roll = await telaresService.getViajeroDetails(qr_code, req.user);
    if (!roll) {
      return res.status(404).json({ message: 'Rollo Viajero no encontrado.' });
    }
    res.json(roll);
  } catch (err) {
    next(err);
  }
};

exports.getWipSummary = async (req, res, next) => {
  try {
    const summary = await telaresService.getWipSummary(req.user);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

exports.transferCart = async (req, res, next) => {
  try {
    const { loom_id, rack_id, cart_qr, spools_to_load } = req.body;
    const operator_id = req.user?.id;
    const result = await telaresService.assignCartToLoom({
      loom_id: Number(loom_id),
      rack_id: rack_id ? Number(rack_id) : undefined,
      cart_qr: cart_qr ? String(cart_qr).trim() : undefined,
      spools_to_load: spools_to_load === undefined || spools_to_load === null || spools_to_load === '' ? undefined : Number(spools_to_load),
      operator_id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getPtiTransferMode = async (req, res, next) => {
  try {
    res.json({ transfer_mode: await telaresService.getPtiTransferMode() });
  } catch (err) {
    next(err);
  }
};

exports.updatePtiTransferMode = async (req, res, next) => {
  try {
    const roleCode = req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '');
    if (roleCode !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, message: 'Solo Superadmin puede cambiar el modo de transferencia de PTI.' });
    }
    const result = await telaresService.setPtiTransferMode(req.body?.transfer_mode, req.user?.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
