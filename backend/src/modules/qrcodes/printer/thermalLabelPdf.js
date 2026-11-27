'use strict';

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { encryptQrData } = require('../../../shared/utils/crypto.utils');

const MM_TO_PT = 72 / 25.4;
const QR_QUIET_ZONE_MODULES = 4;
const DEFAULT_LABEL_SIZE = '62x55';
const DK2205_ROLL_LENGTH_MM = 30_400;
const MAX_LABELS_PER_PDF = 500;
const LABEL_PROFILES = Object.freeze({
  '62x45': Object.freeze({ id: '62x45', label: 'Compacto', widthMm: 62, heightMm: 45, qrSizeMm: 30 }),
  '62x55': Object.freeze({ id: '62x55', label: 'Estándar', widthMm: 62, heightMm: 55, qrSizeMm: 34 }),
  '62x62': Object.freeze({ id: '62x62', label: 'Cuadrado', widthMm: 62, heightMm: 62, qrSizeMm: 39 }),
});

const mmToPt = (millimeters) => millimeters * MM_TO_PT;

const getLabelProfile = (labelSize = DEFAULT_LABEL_SIZE) => {
  const profile = LABEL_PROFILES[String(labelSize)];
  if (!profile) {
    const error = new Error('Formato térmico no válido. Usa 62x45, 62x55 o 62x62 mm.');
    error.statusCode = 400;
    error.code = 'INVALID_THERMAL_LABEL_SIZE';
    throw error;
  }
  return profile;
};

const getPrintableCodes = (codes) => {
  if (!Array.isArray(codes) || codes.length === 0) {
    const error = new Error('Selecciona al menos un QR para imprimir.');
    error.statusCode = 400;
    error.code = 'EMPTY_QR_PRINT_SELECTION';
    throw error;
  }
  if (codes.length > MAX_LABELS_PER_PDF) {
    const error = new Error(`Puedes generar hasta ${MAX_LABELS_PER_PDF} etiquetas por PDF. Divide la selección en grupos más pequeños.`);
    error.statusCode = 413;
    error.code = 'QR_PRINT_BATCH_TOO_LARGE';
    throw error;
  }

  const seen = new Set();
  return codes.map((item, index) => {
    const identity = String(item?.industrialCode || item?.qr_code || item?.qrCode || '').trim();
    const payload = String(item?.encodedPayload || item?.encoded_payload || '').trim();
    if (!identity || identity.length > 120 || !payload) {
      const error = new Error(`El QR seleccionado en la posición ${index + 1} no tiene una identidad o payload imprimible.`);
      error.statusCode = 400;
      error.code = 'INVALID_QR_PRINT_IDENTIFIER';
      throw error;
    }
    if (seen.has(identity)) {
      const error = new Error(`La selección contiene el QR duplicado ${identity}.`);
      error.statusCode = 400;
      error.code = 'DUPLICATE_QR_PRINT_IDENTIFIER';
      throw error;
    }
    seen.add(identity);
    return { identity, payload };
  });
};

const estimatePaperUsage = (count, labelSize = DEFAULT_LABEL_SIZE) => {
  const profile = getLabelProfile(labelSize);
  const quantity = Number(count);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LABELS_PER_PDF) {
    const error = new Error(`La cantidad de etiquetas debe ser un entero entre 1 y ${MAX_LABELS_PER_PDF}.`);
    error.statusCode = quantity > MAX_LABELS_PER_PDF ? 413 : 400;
    error.code = 'INVALID_QR_PRINT_QUANTITY';
    throw error;
  }
  const minimumLengthMm = quantity * profile.heightMm;
  return {
    count: quantity,
    labelSize: profile.id,
    labelLengthMm: profile.heightMm,
    minimumLengthMm,
    minimumLengthM: minimumLengthMm / 1000,
    rollLengthMm: DK2205_ROLL_LENGTH_MM,
    theoreticalLabelsPerRoll: Math.floor(DK2205_ROLL_LENGTH_MM / profile.heightMm),
    theoreticalRollFraction: minimumLengthMm / DK2205_ROLL_LENGTH_MM,
    excludesAdvanceGapAndCalibration: true,
    yieldIsGuaranteed: false,
  };
};

const wrapIdentifier = (doc, identity, widthPt, fontSize) => {
  const lines = [];
  let line = '';
  for (const character of identity) {
    const nextLine = `${line}${character}`;
    if (line && doc.widthOfString(nextLine, { font: 'Helvetica-Bold', fontSize }) > widthPt) {
      lines.push(line);
      line = character;
    } else {
      line = nextLine;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
};

const fitIdentifierFontSize = (doc, identity, widthPt, maxHeightPt) => {
  for (let size = 7.5; size >= 4.5; size -= 0.25) {
    const wrappedIdentity = wrapIdentifier(doc, identity, widthPt, size);
    const height = wrappedIdentity.split('\n').length * size * 1.25;
    if (height <= maxHeightPt) return { fontSize: size, wrappedIdentity };
  }
  const error = new Error('El identificador no cabe de forma legible en la etiqueta seleccionada.');
  error.statusCode = 400;
  error.code = 'QR_LABEL_IDENTIFIER_TOO_LONG';
  throw error;
};

const drawQrModules = (doc, payload, xPt, yPt, matrixWithQuietZonePt) => {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'Q' });
  const matrixSize = qr.modules.size;
  const modulePt = matrixWithQuietZonePt / (matrixSize + QR_QUIET_ZONE_MODULES * 2);
  const quietZonePt = modulePt * QR_QUIET_ZONE_MODULES;

  doc.save();
  doc.fillColor('#FFFFFF').rect(xPt, yPt, matrixWithQuietZonePt, matrixWithQuietZonePt).fill();
  doc.fillColor('#000000');
  for (let row = 0; row < matrixSize; row += 1) {
    let runStart = -1;
    for (let column = 0; column <= matrixSize; column += 1) {
      const dark = column < matrixSize && Boolean(qr.modules.data[row * matrixSize + column]);
      if (dark && runStart < 0) runStart = column;
      if (!dark && runStart >= 0) {
        doc.rect(
          xPt + quietZonePt + runStart * modulePt,
          yPt + quietZonePt + row * modulePt,
          (column - runStart) * modulePt,
          modulePt,
        ).fill();
        runStart = -1;
      }
    }
  }
  doc.restore();
  return { qrVersion: qr.version, matrixSize, quietZoneModules: QR_QUIET_ZONE_MODULES, errorCorrectionLevel: 'Q' };
};

const drawLabel = (doc, code, profile) => {
  const pageWidthPt = mmToPt(profile.widthMm);
  const pageHeightPt = mmToPt(profile.heightMm);
  const sideMarginPt = mmToPt(3);
  const contentWidthPt = pageWidthPt - sideMarginPt * 2;
  const topPt = mmToPt(1.7);
  const qrSizePt = mmToPt(profile.qrSizeMm);
  const qrXPt = (pageWidthPt - qrSizePt) / 2;
  const qrYPt = mmToPt(7.2);
  const identityY = qrYPt + qrSizePt + mmToPt(0.8);
  const identityBottom = pageHeightPt - mmToPt(1.5);
  const identityHeight = identityBottom - identityY;
  const identityLayout = fitIdentifierFontSize(doc, code.identity, contentWidthPt, identityHeight);

  if (identityHeight <= 0 || qrYPt + qrSizePt > identityBottom) {
    const error = new Error(`El QR no cabe en la etiqueta ${profile.id}.`);
    error.statusCode = 400;
    error.code = 'QR_LABEL_LAYOUT_INVALID';
    throw error;
  }

  doc.save();
  doc.rect(0, 0, pageWidthPt, pageHeightPt).fill('#FFFFFF');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.25)
    .text('INTERPLAS MÉXICO', sideMarginPt, topPt, { width: contentWidthPt, align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(6.5)
    .text('TRACEFLOW MES', sideMarginPt, mmToPt(4.2), { width: contentWidthPt, align: 'center', lineBreak: false });
  const qrMetrics = drawQrModules(doc, code.payload, qrXPt, qrYPt, qrSizePt);
  doc.font('Helvetica-Bold').fontSize(identityLayout.fontSize).fillColor('#000000')
    .text(identityLayout.wrappedIdentity, sideMarginPt, identityY, {
      width: contentWidthPt,
      height: identityHeight,
      align: 'center',
      lineGap: 0,
      ellipsis: false,
    });
  doc.restore();
  return qrMetrics;
};

const generateThermalQrPdf = async (codes, labelSize = DEFAULT_LABEL_SIZE) => {
  const profile = getLabelProfile(labelSize);
  const printableCodes = getPrintableCodes(codes);
  const pageWidthPt = mmToPt(profile.widthMm);
  const pageHeightPt = mmToPt(profile.heightMm);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidthPt, pageHeightPt],
      margin: 0,
      compress: true,
      autoFirstPage: false,
      info: { Title: `TraceFlow QR · Brother DK-2205 ${profile.id}`, Author: 'TraceFlow MES' },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), profile, count: printableCodes.length }));
    doc.on('error', reject);
    try {
      for (const code of printableCodes) {
        doc.addPage({ size: [pageWidthPt, pageHeightPt], margin: 0 });
        drawLabel(doc, code, profile);
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
};

const generateThermalCalibrationPdf = async () => {
  const testCodes = [
    { identity: 'TEST-ONLY-DK2205-COMPACT', payload: encryptQrData('TEST-ONLY-DK2205-COMPACT') },
    { identity: 'TEST-ONLY-DK2205-STANDARD', payload: encryptQrData('TEST-ONLY-DK2205-STANDARD') },
    { identity: 'TEST-ONLY-DK2205-SQUARE', payload: encryptQrData('TEST-ONLY-DK2205-SQUARE') },
  ];
  const profiles = [LABEL_PROFILES['62x45'], LABEL_PROFILES['62x55'], LABEL_PROFILES['62x62']];
  const doc = new PDFDocument({ autoFirstPage: false, margin: 0, compress: true, info: { Title: 'TraceFlow DK-2205 Calibration · TEST ONLY', Author: 'TraceFlow MES' } });
  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      profiles.forEach((profile, index) => {
        doc.addPage({ size: [mmToPt(profile.widthMm), mmToPt(profile.heightMm)], margin: 0 });
        drawLabel(doc, { ...testCodes[index], identity: `PRUEBA · ${testCodes[index].identity}` }, profile);
      });
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
};

module.exports = {
  DEFAULT_LABEL_SIZE,
  DK2205_ROLL_LENGTH_MM,
  LABEL_PROFILES,
  MAX_LABELS_PER_PDF,
  QR_QUIET_ZONE_MODULES,
  estimatePaperUsage,
  generateThermalCalibrationPdf,
  generateThermalQrPdf,
  getLabelProfile,
  getPrintableCodes,
  mmToPt,
};
