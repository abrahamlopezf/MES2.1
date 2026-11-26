'use strict';

const { Op } = require('sequelize');
const db = require('../../database/models');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');

const AREA_CODES = new Set(['LAMINADO', 'GLOBO']);
const fail = (statusCode, message, code) => Object.assign(new Error(message), { statusCode, code });

async function record({ destinationAreaCode, qrCode, meterStart, meterEnd, reason, notes, userId }) {
  const destination = String(destinationAreaCode || '').trim().toUpperCase();
  if (!AREA_CODES.has(destination)) throw fail(400, 'Área de detección inválida.');
  const qrValue = normalizeViajeroQr(qrCode);
  if (!qrValue) throw fail(400, 'Escanea el QR original del rollo.');
  const start = Number(meterStart);
  const end = Number(meterEnd);
  const scrapMeters = Number((end - start).toFixed(2));
  const cleanReason = String(reason || '').trim();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || scrapMeters <= 0 || !cleanReason) throw fail(400, 'Indica un tramo válido y el motivo de la merma.');

  return db.sequelize.transaction(async (transaction) => {
    const roll = await db.ViajeroRoll.findOne({
      where: { [Op.or]: [{ qr_code: qrValue }, { roll_code: qrValue }, { qr_code: `VIAJERO-${qrValue}` }, { roll_code: qrValue.replace(/^VIAJERO-/, '') }], is_active: true },
      transaction, lock: { level: transaction.LOCK.UPDATE, of: db.ViajeroRoll },
    });
    if (!roll) throw fail(404, 'No se encontró un rollo activo con ese QR.');
    if (end > Number(roll.meters) + 0.02) throw fail(400, `El tramo termina en ${end} m, pero el rollo tiene ${roll.meters} m.`);
    const sourceQr = await db.QrCode.findByPk(roll.virgin_qr_code_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!sourceQr || normalizeViajeroQr(sourceQr.qr_code) !== qrValue) throw fail(409, 'El QR escaneado no corresponde al QR original activo de este rollo.');
    const picked = await db.CorteLaminadoOrderItem.findOne({
      where: { roll_id: roll.id, status: 'PICKED' },
      include: [{ model: db.CorteLaminadoOrder, as: 'order', where: { destination_area_code: destination }, attributes: ['id', 'order_number'] }],
      transaction, lock: { level: transaction.LOCK.UPDATE, of: db.CorteLaminadoOrderItem },
    });
    if (!picked) throw fail(409, `El rollo debe estar recogido por una orden de Corte para ${destination}.`);
    const area = await db.Area.findOne({ where: { code: destination }, transaction });
    const traceable = await db.TraceableItem.findOne({ where: { qr_code_id: sourceQr.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!area || !traceable || Number(traceable.current_area_id) !== Number(area.id)) throw fail(409, `El QR no está bajo custodia del WIP de ${destination}.`);

    const existing = await db.TelaresScrapObservation.findAll({ where: { viajero_roll_id: roll.id }, transaction, lock: transaction.LOCK.UPDATE });
    const overlap = existing.find((item) => start < Number(item.meter_end) - 0.001 && end > Number(item.meter_start) + 0.001);
    if (overlap) throw fail(409, `El tramo ${start}-${end} m ya se registró como defecto. Revisa el historial del rollo.`);
    const previousMeters = existing.reduce((sum, item) => sum + Number(item.scrap_meters), 0);
    if (previousMeters + scrapMeters > Number(roll.meters) + 0.02) throw fail(409, 'Los tramos de merma exceden el metraje de entrada.');
    const estimatedWeightKg = Number((scrapMeters * Number(roll.weight_kg) / Number(roll.meters)).toFixed(3));
    const observation = await db.TelaresScrapObservation.create({
      viajero_roll_id: roll.id, source_qr_code_id: sourceQr.id, destination_area_code: destination,
      detecting_area_id: area.id, meter_start: start, meter_end: end, scrap_meters: scrapMeters,
      estimated_weight_kg: estimatedWeightKg, reason: cleanReason, notes: String(notes || '').trim() || null, recorded_by: userId,
    }, { transaction });
    await db.ViajeroRoutingLog.create({
      viajero_roll_id: roll.id, from_stage: 'TELARES', to_stage: destination, area_id: area.id, operator_id: userId,
      action: 'DEFECTO_TELARES_DETECTADO_EN_DESENROLLE', notes: `Rango ${start}-${end} m (${scrapMeters} m), estimación ${estimatedWeightKg} kg. Causa atribuida a Telares; detectado en ${destination}. Motivo: ${cleanReason}.`,
    }, { transaction });
    return { id: observation.id, roll_code: roll.roll_code, qr_code: sourceQr.qr_code, destination_area_code: destination, meter_start: start, meter_end: end, scrap_meters: scrapMeters, estimated_weight_kg: estimatedWeightKg, weight_basis: 'proporción peso/metraje registrado del rollo de Telares', reason: cleanReason, recorded_at: observation.created_at };
  });
}

async function listForRoll(rollId, transaction) {
  return db.TelaresScrapObservation.findAll({ where: { viajero_roll_id: rollId }, order: [['meter_start', 'ASC'], ['id', 'ASC']], transaction });
}

module.exports = { record, listForRoll };
