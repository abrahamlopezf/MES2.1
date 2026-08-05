const { QrCode, TraceabilityEvent } = require('../../database/models');

class QrDomainService {
  /**
   * Valida si un QR existe y si se encuentra en un estado permitido.
   * Lanza un error de dominio si falla la validación.
   */
  async validateQrStatus(code, allowedStatuses = ['AVAILABLE'], transaction = null) {
    const qr = await QrCode.findOne({
      where: { qr_code: code },
      transaction
    });

    if (!qr) {
      throw new Error(`El QR ${code} no existe en el sistema.`);
    }

    if (!allowedStatuses.includes(qr.status)) {
      throw new Error(`El QR ${code} se encuentra en estado ${qr.status} y no puede ser procesado. Estados permitidos: ${allowedStatuses.join(', ')}.`);
    }

    return qr;
  }

  /**
   * Activa un QR disponible, cambiándolo a estado ACTIVE.
   */
  async activateQr(qrCodeRecord, transaction = null) {
    if (qrCodeRecord.status !== 'AVAILABLE') {
      throw new Error(`El QR ${qrCodeRecord.qr_code} no puede ser activado porque su estado actual es ${qrCodeRecord.status}.`);
    }

    qrCodeRecord.status = 'ACTIVE';
    await qrCodeRecord.save({ transaction });

    return qrCodeRecord;
  }
}

module.exports = new QrDomainService();
