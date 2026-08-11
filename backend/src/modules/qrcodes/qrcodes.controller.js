const qrcodesService = require('./qrcodes.service');
const { successResponse } = require('../../shared/responses/apiResponse');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const fs = require('fs');
const generateQrBatch = async (req, res, next) => {
  try {
    const result = await qrcodesService.generateQrBatch(req.body, req.user);

    return successResponse(res, 'Lote de códigos QR generado correctamente.', result, 201);
  } catch (error) {
    fs.writeFileSync('C:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\backend\\error_log.txt', error.stack || error.toString());
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

const getIconPaths = (prefix) => {
  if (prefix === 'ALM') {
    return [
      { type: 'path', d: 'M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11' },
      { type: 'path', d: 'M14 9h4l4 4v5c0 .6-.4 1-1 1h-2' },
      { type: 'circle', cx: 7, cy: 18, r: 2 },
      { type: 'circle', cx: 17, cy: 18, r: 2 }
    ];
  }
  if (prefix === 'EXT' || prefix === 'MEZ') {
    return [
      { type: 'path', d: 'M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z' },
      { type: 'path', d: 'M17 18h1' },
      { type: 'path', d: 'M12 18h1' },
      { type: 'path', d: 'M7 18h1' }
    ];
  }
  return [
    { type: 'path', d: 'm7.5 4.27 9 5.15' },
    { type: 'path', d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' },
    { type: 'path', d: 'm3.3 7 8.7 5 8.7-5' },
    { type: 'path', d: 'M12 22V12' }
  ];
};

const generatePDFForQRs = async (codes) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const cmToPt = 28.3465;
      const cellSize = 5 * cmToPt; // 141.73 pts
      const cols = 4;
      const rows = 5;
      const marginX = (595.28 - (cols * cellSize)) / 2;
      const marginY = (841.89 - (rows * cellSize)) / 2;

      for (let i = 0; i < codes.length; i++) {
        if (i > 0 && i % (cols * rows) === 0) {
          doc.addPage();
        }

        const code = codes[i];
        const qrString = code.industrialCode || code.qr_code;
        const prefix = qrString.split('-')[0];
        const serialNum = parseInt(code.serial || qrString.split('-').pop(), 10).toString();
        
        const positionOnPage = i % (cols * rows);
        const col = positionOnPage % cols;
        const row = Math.floor(positionOnPage / cols);

        const x = marginX + (col * cellSize);
        const y = marginY + (row * cellSize);

        // 1. Draw rounded outer border (Sticker shape)
        doc.roundedRect(x + 5, y + 5, cellSize - 10, cellSize - 10, 12)
           .lineWidth(1)
           .stroke('#e2e8f0');

        // 2. Draw QR code
        const qrSize = cellSize * 0.75; 
        const qrX = x + (cellSize - qrSize) / 2;
        const qrY = y + 10; 

        const qrDataUrl = await QRCode.toDataURL(qrString, { 
          width: 300, 
          margin: 0, 
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' } 
        });
        
        doc.image(qrDataUrl, qrX, qrY, { width: qrSize });

        // 3. Center Mask (Black rounded square)
        const maskSize = qrSize * 0.28;
        const maskX = qrX + (qrSize - maskSize) / 2;
        const maskY = qrY + (qrSize - maskSize) / 2;
        
        doc.roundedRect(maskX, maskY, maskSize, maskSize, 6).fill('black');

        // 4. Center Icon (White SVG)
        const iconScale = (maskSize * 0.6) / 24; 
        const iconX = maskX + (maskSize - (24 * iconScale)) / 2;
        const iconY = maskY + (maskSize - (24 * iconScale)) / 2;

        doc.save();
        doc.translate(iconX, iconY);
        doc.scale(iconScale);
        doc.lineWidth(2).strokeColor('white').fillColor('transparent');
        
        const paths = getIconPaths(prefix);
        for (const p of paths) {
          if (p.type === 'path') doc.path(p.d).stroke();
          if (p.type === 'circle') doc.circle(p.cx, p.cy, p.r).stroke();
        }
        doc.restore();

        // 5. Bottom Black Bar with Serial
        const barHeight = 18;
        const barMarginX = 15;
        const barX = x + barMarginX;
        // Fix: Position the bar BELOW the QR code so it doesn't corrupt the bottom modules
        const barY = qrY + qrSize + 4;
        const barWidth = cellSize - (barMarginX * 2);
        
        doc.rect(barX, barY, barWidth, barHeight).fill('black');

        doc.fontSize(10).font('Helvetica-Bold').fillColor('white').text(serialNum, barX, barY + 4, {
          width: barWidth,
          align: 'center'
        });
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
    const cleanCode = String(req.params.qrCode || '').trim();
    const result = await qrcodesService.lookup(cleanCode);
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