'use strict';
const service = require('./corte.service');

class CorteController {
  async eligible(req, res, next) { try { res.json({ success: true, data: await service.getEligibleRolls() }); } catch (error) { next(error); } }
  async laminatedWip(req, res, next) { try { res.json({ success: true, data: await service.getLaminatedWip() }); } catch (error) { next(error); } }
  async demandOptions(req, res, next) { try { res.json({ success: true, data: await service.getDemandOptions() }); } catch (error) { next(error); } }
  async list(req, res, next) { try { res.json({ success: true, data: await service.listOrders({ includeClosed: req.query.include_closed === 'true' }) }); } catch (error) { next(error); } }
  async create(req, res, next) { try { res.status(201).json({ success: true, data: await service.createOrder({ specificationId: req.body.specification_id, requestedRollCount: req.body.requested_roll_count, requestedBy: req.user.id, notes: req.body.notes }) }); } catch (error) { next(error); } }
  async cancel(req, res, next) { try { res.json({ success: true, data: await service.cancelOrder(Number(req.params.id), req.user.id) }); } catch (error) { next(error); } }
  async pick(req, res, next) { try { res.json({ success: true, data: await service.pickRoll({ orderId: Number(req.params.id), qrCode: req.body.qr_code, pickedBy: req.user.id }) }); } catch (error) { next(error); } }
  async processOptions(req, res, next) { try { res.json({ success: true, data: await service.getProcessDemandOptions(req.query.destination_area_code) }); } catch (error) { next(error); } }
  async processOrders(req, res, next) {
    try {
      const area = processAreaForUser(req.user);
      const destination = area || req.query.destination_area_code;
      res.json({ success: true, data: await service.listProcessOrders({ destinationAreaCode: destination, includeClosed: req.query.include_closed === 'true' }) });
    } catch (error) { next(error); }
  }
  async createProcessOrder(req, res, next) {
    try {
      const roleCode = String(req.user?.role?.code || req.user?.role || '').toUpperCase();
      if (req.body.is_urgent === true && !['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_CORTE', 'SUPERVISOR_CORTE'].includes(roleCode)) {
        return res.status(403).json({ success: false, message: 'Solo Admin o Supervisor de Corte puede marcar una orden como urgente.' });
      }
      res.status(201).json({ success: true, data: await service.createProcessOrder({
        destinationAreaCode: req.body.destination_area_code,
        specificationId: req.body.specification_id,
        requestedRollCount: req.body.requested_roll_count,
        requestedBy: req.user.id,
        notes: req.body.notes,
        isUrgent: req.body.is_urgent === true,
        urgentReason: req.body.urgent_reason,
      }) });
    } catch (error) { next(error); }
  }
  async processPickupScan(req, res, next) {
    try {
      const destinationAreaCode = processAreaForUser(req.user) || req.body.destination_area_code;
      res.json({ success: true, data: await service.pickupProcessRoll({ qrCode: req.body.qr_code, pickedBy: req.user.id, destinationAreaCode }) });
    } catch (error) { next(error); }
  }
  async dispatchLaminatedOutput(req, res, next) {
    try { res.json({ success: true, data: await service.dispatchLaminatedOutput({ qrCode: req.body.qr_code, dispatchedBy: req.user.id }) }); } catch (error) { next(error); }
  }
  async receiveLaminatedOutput(req, res, next) {
    try { res.json({ success: true, data: await service.receiveLaminatedOutput({ qrCode: req.body.qr_code, receivedBy: req.user.id }) }); } catch (error) { next(error); }
  }
  async laminatedOutputTransfers(req, res, next) {
    try { res.json({ success: true, data: await service.listProcessOrders({ destinationAreaCode: 'LAMINADO' }) }); } catch (error) { next(error); }
  }
}

function processAreaForUser(user) {
  const areaCode = String(user?.area?.code || user?.role?.area?.code || '').toUpperCase();
  const roleCode = String(user?.role?.code || user?.role || '').toUpperCase();
  if (areaCode === 'LAMINADO' || roleCode.includes('LAMINADO')) return 'LAMINADO';
  if (areaCode === 'GLOBO' || roleCode.includes('GLOBO') || roleCode.includes('LINER')) return 'GLOBO';
  return null;
}
module.exports = new CorteController();
