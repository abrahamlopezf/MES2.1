const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const generateConsumptionOrderPdf = async (order, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      doc.pipe(res);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('ORDEN DE CONSUMO', { align: 'left' });
      doc.fontSize(10).font('Helvetica').fillColor('gray').text('Documento interno de almacén y producción', { align: 'left' });
      doc.moveUp(2);
      
      doc.fillColor('black').fontSize(20).font('Helvetica-Bold').text(order.order_number, { align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor('gray').text(`Fecha: ${new Date(order.created_at).toLocaleString()}`, { align: 'right' });
      doc.fontSize(8).font('Courier').text(`UUID: ${order.uuid}`, { align: 'right' });
      
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(1.5);

      // Main Info Box
      const boxTop = doc.y;
      
      // QR Code
      const qrValue = `ORD-${order.uuid}`;
      const qrDataUrl = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'H', margin: 1 });
      doc.image(qrDataUrl, 450, boxTop, { width: 100 });
      doc.fontSize(8).font('Courier').fillColor('black').text(qrValue, 450, boxTop + 105, { width: 100, align: 'center' });

      // Request Details
      doc.fontSize(12).font('Helvetica-Bold').fillColor('gray').text('DATOS DE LA SOLICITUD', 50, boxTop);
      doc.moveDown(1);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Solicitante: ', { continued: true })
         .font('Helvetica').text(`${order.requester?.name || order.requester?.first_name} ${order.requester?.last_name || ''}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Área: ', { continued: true })
         .font('Helvetica').text(`${order.requesting_area?.name || 'N/A'}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Estado: ', { continued: true })
         .font('Helvetica-Bold').text(`${order.status}`);
      
      doc.moveDown(2);

      // Notes
      if (order.notes) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Notas / Justificación:');
        doc.font('Helvetica').text(order.notes);
        doc.moveDown(2);
      }

      // Materials Table
      doc.fontSize(14).font('Helvetica-Bold').fillColor('black').text('Materiales Solicitados', 50, doc.y);
      doc.moveDown(1);

      const tableTop = doc.y;
      const colWidths = [30, 80, 200, 100, 100];
      const colX = [50, 80, 160, 360, 460];
      
      // Table Header
      doc.rect(50, tableTop, 510, 20).fillAndStroke('#eeeeee', '#000000');
      doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
      doc.text('No.', colX[0], tableTop + 5, { width: colWidths[0], align: 'center' });
      doc.text('Código', colX[1], tableTop + 5, { width: colWidths[1], align: 'left' });
      doc.text('Material', colX[2], tableTop + 5, { width: colWidths[2], align: 'left' });
      doc.text('Lote', colX[3], tableTop + 5, { width: colWidths[3], align: 'center' });
      doc.text('Cantidad', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });

      let y = tableTop + 20;
      doc.font('Helvetica');

      if (!order.items || order.items.length === 0) {
        doc.rect(50, y, 510, 30).stroke();
        doc.fillColor('gray').text('Esta orden no contiene materiales', 50, y + 10, { width: 510, align: 'center' });
        y += 30;
      } else {
        order.items.forEach((item, index) => {
          doc.rect(50, y, 510, 25).stroke();
          doc.fillColor('black').text(index + 1, colX[0], y + 7, { width: colWidths[0], align: 'center' });
          doc.font('Courier').text(item.material?.material_code || '', colX[1], y + 7, { width: colWidths[1], align: 'left' });
          doc.font('Helvetica').text(item.material?.name || '', colX[2], y + 7, { width: colWidths[2], align: 'left', height: 15, ellipsis: true });
          doc.font('Courier').text(item.lote?.folio || 'N/A', colX[3], y + 7, { width: colWidths[3], align: 'center' });
          
          const qty = parseFloat(item.requested_quantity).toFixed(2);
          const unit = item.unit?.abbreviation || 'Unidades';
          doc.font('Helvetica-Bold').text(`${qty} ${unit}`, colX[4], y + 7, { width: colWidths[4], align: 'right' });
          
          y += 25;
        });
      }

      // Signatures
      doc.moveDown(5);
      const signatureY = doc.y;
      
      doc.moveTo(100, signatureY).lineTo(250, signatureY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text('Firma de Entrega (Almacén)', 100, signatureY + 5, { width: 150, align: 'center' });
      
      doc.moveTo(350, signatureY).lineTo(500, signatureY).stroke();
      doc.text('Firma de Recibido (Producción)', 350, signatureY + 5, { width: 150, align: 'center' });

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateConsumptionOrderPdf
};
