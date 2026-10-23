const telaresService = require('./telares.service');

exports.getLooms = async (req, res, next) => {
  try {
    const looms = await telaresService.getLooms(req.query.all === 'true');
    res.json(looms);
  } catch (err) {
    next(err);
  }
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
  try { res.status(201).json(await telaresService.saveBom(req.body)); } catch (err) { next(err); }
};

exports.updateBom = async (req, res, next) => {
  try { res.json(await telaresService.saveBom(req.body, Number(req.params.id))); } catch (err) { next(err); }
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
    const { loom_id, bom_id, shift, meters_planned, notes } = req.body;
    const operator_id = req.user?.id;
    const run = await telaresService.startLoomRun({
      loom_id: Number(loom_id),
      bom_id: Number(bom_id),
      operator_id,
      shift,
      meters_planned: Number(meters_planned || 1500),
      notes,
    });
    res.status(201).json(run);
  } catch (err) {
    next(err);
  }
};

exports.finishRoll = async (req, res, next) => {
  try {
    const { run_id, meters, weight_kg, custom_route, notes } = req.body;
    const operator_id = req.user?.id;
    const result = await telaresService.finishRollAndBackflush({
      run_id: Number(run_id),
      meters: Number(meters),
      weight_kg: Number(weight_kg),
      operator_id,
      custom_route,
      notes,
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
    const roll = await telaresService.getViajeroDetails(qr_code);
    if (!roll) {
      return res.status(404).json({ message: 'Rollo Viajero no encontrado.' });
    }
    res.json(roll);
  } catch (err) {
    next(err);
  }
};
