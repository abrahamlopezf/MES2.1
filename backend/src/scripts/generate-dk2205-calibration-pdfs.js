'use strict';

const fs = require('fs');
const path = require('path');
const { generateThermalQrPdf } = require('../modules/qrcodes/printer/thermalLabelPdf');
const { encryptQrData } = require('../shared/utils/crypto.utils');

const outputDirectory = path.resolve(__dirname, '../../../docs/qa/thermal-printing');
const samples = [
  ['62x45', 'Brother-DK2205-62x45mm.pdf'],
  ['62x55', 'Brother-DK2205-62x55mm.pdf'],
  ['62x62', 'Brother-DK2205-62x62mm.pdf'],
];

(async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const [profile, filename] of samples) {
    const calibrationCode = `TEST-ONLY-DK2205-${profile}-001`;
    const { buffer } = await generateThermalQrPdf([{
      qr_code: calibrationCode,
      encodedPayload: encryptQrData(calibrationCode),
    }], profile);
    fs.writeFileSync(path.join(outputDirectory, filename), buffer);
    process.stdout.write(`${filename}\n`);
  }
})().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
