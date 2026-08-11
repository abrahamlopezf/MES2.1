const { QrCode } = require('./src/database/models');
QrCode.findOne({where: {qr_code: 'ALM-000000172'}}).then(qr => {
  console.log('QR Status in DB:', qr ? qr.status : 'NOT_FOUND');
  process.exit(0);
}).catch(console.error);
