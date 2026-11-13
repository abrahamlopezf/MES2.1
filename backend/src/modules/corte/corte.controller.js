'use strict';
const service = require('./corte.service');

class CorteController {
  async eligible(req, res, next) { try { res.json({ success: true, data: await service.getEligibleRolls() }); } catch (error) { next(error); } }
  async list(req, res, next) { try { res.json({ success: true, data: await service.listOrders({ includeClosed: req.query.include_closed === 'true' }) }); } catch (error) { next(error); } }
  async create(req, res, next) { try { res.status(201).json({ success: true, data: await service.createOrder({ rollIds: req.body.roll_ids, requestedBy: req.user.id, notes: req.body.notes }) }); } catch (error) { next(error); } }
  async cancel(req, res, next) { try { res.json({ success: true, data: await service.cancelOrder(Number(req.params.id), req.user.id) }); } catch (error) { next(error); } }
  async pick(req, res, next) { try { res.json({ success: true, data: await service.pickRoll({ orderId: Number(req.params.id), qrCode: req.body.qr_code, pickedBy: req.user.id }) }); } catch (error) { next(error); } }
}
module.exports = new CorteController();
