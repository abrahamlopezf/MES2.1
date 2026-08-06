const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');

async function testPdf() {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(fs.createWriteStream('test-label.pdf'));

  const cmToPt = 28.3465;
  const cellSize = 5 * cmToPt; // 141.73
  
  const x = 100;
  const y = 100;

  // Background rounded rect (like the sticker)
  doc.roundedRect(x, y, cellSize, cellSize, 15)
     .lineWidth(1)
     .stroke('#cccccc')
     .fill('white');

  // QR Image
  const qrSize = cellSize * 0.8; 
  const qrX = x + (cellSize - qrSize) / 2;
  const qrY = y + (cellSize - qrSize) / 2 - 10; // slightly up to leave room for bottom bar

  const qrDataUrl = await QRCode.toDataURL('ALM-000000116', { 
    width: 300, 
    margin: 0, 
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' } 
  });
  
  doc.image(qrDataUrl, qrX, qrY, { width: qrSize });

  // Center mask (black rounded rect)
  const maskSize = qrSize * 0.3;
  const maskX = qrX + (qrSize - maskSize) / 2;
  const maskY = qrY + (qrSize - maskSize) / 2;
  
  doc.roundedRect(maskX, maskY, maskSize, maskSize, 5).fill('black');

  // Center icon (Truck SVG)
  // <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
  const iconScale = (maskSize * 0.6) / 24; // Lucide icons are 24x24
  const iconX = maskX + (maskSize - (24 * iconScale)) / 2;
  const iconY = maskY + (maskSize - (24 * iconScale)) / 2;

  doc.save();
  doc.translate(iconX, iconY);
  doc.scale(iconScale);
  doc.lineWidth(2).strokeColor('white').fillColor('transparent');
  doc.path('M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11')
     .path('M14 9h4l4 4v5c0 .6-.4 1-1 1h-2')
     .stroke();
  doc.circle(7, 18, 2).stroke();
  doc.circle(17, 18, 2).stroke();
  doc.restore();

  // Bottom black bar
  const barHeight = 20;
  const barMargin = 15;
  const barX = x + barMargin;
  const barY = y + cellSize - barHeight - barMargin;
  const barWidth = cellSize - (barMargin * 2);
  
  doc.rect(barX, barY, barWidth, barHeight).fill('black');

  // Text inside bottom bar
  doc.fontSize(10).fillColor('white').text('ALM-000000116', barX, barY + 5, {
    width: barWidth,
    align: 'center'
  });

  doc.end();
}

testPdf();
