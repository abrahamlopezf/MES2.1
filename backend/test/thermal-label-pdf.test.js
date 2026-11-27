'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const QRCode = require('qrcode');
const PNG = require('pngjs').PNG;
const ZXing = require('../node_modules/html5-qrcode/third_party/zxing-js.umd.js');
const {
  DEFAULT_LABEL_SIZE,
  MAX_LABELS_PER_PDF,
  QR_QUIET_ZONE_MODULES,
  estimatePaperUsage,
  generateThermalCalibrationPdf,
  generateThermalQrPdf,
  getLabelProfile,
  getPrintableCodes,
  mmToPt,
} = require('../src/modules/qrcodes/printer/thermalLabelPdf');
const { encryptQrData, decryptQrData } = require('../src/shared/utils/crypto.utils');

const makeCalibrationCodes = (count) => Array.from({ length: count }, (_, index) => {
  const id = `TEST-ONLY-DK2205-${String(index + 1).padStart(3, '0')}`;
  return { qr_code: id, encodedPayload: encryptQrData(id) };
});

const countPdfPages = (buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
const decodePngQr = (pngBuffer) => {
  const png = PNG.sync.read(pngBuffer);
  const pixels = new Int32Array(png.width * png.height);
  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    pixels[index] = (png.data[offset] << 16) | (png.data[offset + 1] << 8) | png.data[offset + 2];
  }
  const luminance = new ZXing.RGBLuminanceSource(pixels, png.width, png.height);
  return new ZXing.QRCodeReader().decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance))).getText();
};

test('Brother DK-2205 uses 62 mm paper and approved 45, 55, and 62 mm lengths', () => {
  for (const [id, heightMm] of [['62x45', 45], ['62x55', 55], ['62x62', 62]]) {
    const profile = getLabelProfile(id);
    assert.equal(profile.widthMm, 62);
    assert.equal(profile.heightMm, heightMm);
  }
  assert.equal(DEFAULT_LABEL_SIZE, '62x55');
  assert.throws(() => getLabelProfile('62x50'), { code: 'INVALID_THERMAL_LABEL_SIZE' });
});

test('paper consumption is calculated in the backend as a non-guaranteed estimate', () => {
  assert.deepEqual(estimatePaperUsage(200, '62x55'), {
    count: 200,
    labelSize: '62x55',
    labelLengthMm: 55,
    minimumLengthMm: 11_000,
    minimumLengthM: 11,
    rollLengthMm: 30_400,
    theoreticalLabelsPerRoll: 552,
    theoreticalRollFraction: 11_000 / 30_400,
    excludesAdvanceGapAndCalibration: true,
    yieldIsGuaranteed: false,
  });
  assert.throws(() => estimatePaperUsage(MAX_LABELS_PER_PDF + 1), { code: 'INVALID_QR_PRINT_QUANTITY' });
});

test('print selection rejects empty, missing-payload, overlong, and duplicate identities', () => {
  assert.throws(() => getPrintableCodes([]), { code: 'EMPTY_QR_PRINT_SELECTION' });
  assert.throws(() => getPrintableCodes([{ qr_code: 'TF-CAL-001' }]), { code: 'INVALID_QR_PRINT_IDENTIFIER' });
  assert.throws(() => getPrintableCodes([{ qr_code: 'TF-CAL-001', encodedPayload: 'x' }, { qr_code: 'TF-CAL-001', encodedPayload: 'y' }]), {
    code: 'DUPLICATE_QR_PRINT_IDENTIFIER',
  });
  assert.throws(() => getPrintableCodes([{ qr_code: 'x'.repeat(121), encodedPayload: 'payload' }]), {
    code: 'INVALID_QR_PRINT_IDENTIFIER',
  });
});

test('vector QR generation uses level Q and a standards-compliant quiet zone', async () => {
  const originalCreate = QRCode.create;
  let optionsSeen;
  QRCode.create = (payload, options) => {
    optionsSeen = options;
    return originalCreate(payload, options);
  };
  try {
    const { buffer } = await generateThermalQrPdf(makeCalibrationCodes(1), '62x55');
    assert.equal(countPdfPages(buffer), 1);
    assert.deepEqual(optionsSeen, { errorCorrectionLevel: 'Q' });
    assert.equal(QR_QUIET_ZONE_MODULES, 4);
    assert.ok(buffer.includes(Buffer.from('/MediaBox')));
  } finally {
    QRCode.create = originalCreate;
  }
});

test('QR payload decodes with the frontend ZXing engine and decrypts to the original identity', async () => {
  const identity = 'TEST-ONLY-DK2205-SCANNER-001';
  const payload = encryptQrData(identity);
  const image = await QRCode.toBuffer(payload, { type: 'png', width: 600, margin: QR_QUIET_ZONE_MODULES, errorCorrectionLevel: 'Q' });
  assert.equal(decryptQrData(decodePngQr(image)), identity);
});

test('PDF page count matches each requested batch size through 200 labels', async () => {
  for (const count of [1, 3, 10, 50, 100, 200]) {
    const { buffer, count: generatedCount } = await generateThermalQrPdf(makeCalibrationCodes(count));
    assert.equal(generatedCount, count);
    assert.equal(countPdfPages(buffer), count, `cantidad ${count}`);
  }
});

test('PDF MediaBox is physically sized to 62 mm by the chosen label length', async () => {
  for (const [id, heightMm] of [['62x45', 45], ['62x55', 55], ['62x62', 62]]) {
    const { buffer } = await generateThermalQrPdf(makeCalibrationCodes(1), id);
    const source = buffer.toString('latin1');
    const mediaBox = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
    assert.ok(mediaBox, `MediaBox ausente en ${id}`);
    assert.ok(Math.abs(Number(mediaBox[1]) - mmToPt(62)) < 0.02, `ancho ${id}`);
    assert.ok(Math.abs(Number(mediaBox[2]) - mmToPt(heightMm)) < 0.02, `alto ${id}`);
  }
});

test('long alphanumeric QR identities remain printable on the square format', async () => {
  const longIdentity = `TF-CAL-${'AB12'.repeat(27)}`;
  const { buffer } = await generateThermalQrPdf([{
    qr_code: longIdentity,
    encodedPayload: encryptQrData(longIdentity),
  }], '62x62');
  assert.equal(countPdfPages(buffer), 1);
});

test('calibration PDF contains three test-only pages at the three exact physical lengths', async () => {
  const buffer = await generateThermalCalibrationPdf();
  const source = buffer.toString('latin1');
  const pageSizes = [...source.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  assert.equal(countPdfPages(buffer), 3);
  assert.equal(pageSizes.length, 3);
  pageSizes.forEach((match, index) => {
    assert.ok(Math.abs(Number(match[1]) - mmToPt(62)) < 0.02);
    assert.ok(Math.abs(Number(match[2]) - mmToPt([45, 55, 62][index])) < 0.02);
  });
});
