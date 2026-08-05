const qrcodesService = require('./qrcodes.service');
const { successResponse } = require('../../shared/responses/apiResponse');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const generateQrBatch = async (req, res, next) => {
  try {
    const result = await qrcodesService.generateQrBatch(req.body, req.user);

    return successResponse(res, 'Lote de códigos QR generado correctamente.', result, 201);
  } catch (error) {
    return next(error);
  }
};

const getQrCodes = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrCodes(req.query, req.user);

    return successResponse(res, 'Códigos QR obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrBatches = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrBatches(req.query, req.user);
    return successResponse(res, 'Lotes de códigos QR obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrBatchById = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrBatchById(req.params.id, req.user);
    return successResponse(res, 'Lote obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const generatePDFForQRs = async (codes) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 20 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      for (let i = 0; i < codes.length; i++) {
        if (i > 0) doc.addPage();
        const code = codes[i];
        
        doc.fontSize(20).text('TRACEFLOW INDUSTRIAL CORE', { align: 'center' });
        doc.moveDown();
        
        const qrDataUrl = await QRCode.toDataURL(code.industrialCode || code.qr_code, { width: 300 });
        doc.image(qrDataUrl, (doc.page.width - 300) / 2, doc.y, { width: 300 });
        
        doc.moveDown(12);
        doc.fontSize(24).text(code.industrialCode || code.qr_code, { align: 'center' });
        doc.fontSize(16).text(`Status: ${code.status}`, { align: 'center' });
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const printQrBatch = async (req, res, next) => {
  try {
    const batch = await qrcodesService.getQrBatchById(req.params.id, req.user);
    if (!batch.tokens || batch.tokens.length === 0) {
      return res.status(400).json({ success: false, message: 'El lote no tiene códigos para imprimir.' });
    }
    
    const pdfBuffer = await generatePDFForQRs(batch.tokens);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=batch-${batch.batch_code}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};

const printQrCode = async (req, res, next) => {
  try {
    const code = await qrcodesService.getQrCodeByValue(req.params.uuid, req.user);
    const pdfBuffer = await generatePDFForQRs([code]);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=qr-${code.qr_code}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};

const getQrCodeByValue = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrCodeByValue(req.params.qrCode, req.user);

    return successResponse(res, 'Código QR obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const lookup = async (req, res, next) => {
  try {
    const result = await qrcodesService.lookup(req.params.qrCode);
    return successResponse(res, 'Información del QR obtenida correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrEvents = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrEvents(req.params.id, req.user);

    return successResponse(res, 'Eventos del código QR obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const assignQrCodes = async (req, res, next) => {
  try {
    const result = await qrcodesService.assignQrCodes(req.body, req.user);

    return successResponse(res, 'Códigos QR asignados correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const validateQrForUse = async (req, res, next) => {
  try {
    const result = await qrcodesService.validateQrForUse(req.body, req.user);

    return successResponse(res, 'Código QR validado correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const cancelQrCode = async (req, res, next) => {
  try {
    const result = await qrcodesService.cancelQrCode(req.params.id, req.body, req.user);

    return successResponse(res, 'Código QR cancelado correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generateQrBatch,
  getQrCodes,
  getQrCodeByValue,
  getQrEvents,
  assignQrCodes,
  validateQrForUse,
  cancelQrCode,
  getQrBatches,
  getQrBatchById,
  printQrBatch,
  printQrCode,
  lookup,
};