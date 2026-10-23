const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { encryptQrData } = require('../../../shared/utils/crypto.utils');

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
      const encryptedQrValue = encryptQrData(qrValue);
      const qrDataUrl = await QRCode.toDataURL(encryptedQrValue, { errorCorrectionLevel: 'H', margin: 1 });
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
        doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('SE REQUIERE PARA:');
        doc.font('Helvetica').text(order.notes);
        doc.moveDown(2);
      }

      // Materials Table
      doc.fontSize(14).font('Helvetica-Bold').fillColor('black').text('Materiales Solicitados', 50, doc.y);
      doc.moveDown(1);

      const tableTop = doc.y;
      const colWidths = [30, 95, 170, 95, 95];
      const colX = [50, 88, 192, 368, 465];
      
      // Table Header
      doc.rect(50, tableTop, 510, 22).fillAndStroke('#eeeeee', '#000000');
      doc.fillColor('black').fontSize(9.5).font('Helvetica-Bold');
      doc.text('No.', colX[0], tableTop + 6, { width: colWidths[0], align: 'center' });
      doc.text('Código', colX[1], tableTop + 6, { width: colWidths[1], align: 'left' });
      doc.text('Material', colX[2], tableTop + 6, { width: colWidths[2], align: 'left' });
      doc.text('Lote / Factura', colX[3], tableTop + 6, { width: colWidths[3], align: 'center' });
      doc.text('Cantidad', colX[4], tableTop + 6, { width: colWidths[4] - 5, align: 'right' });

      let y = tableTop + 22;
      doc.font('Helvetica');

      if (!order.items || order.items.length === 0) {
        doc.rect(50, y, 510, 30).stroke();
        doc.fillColor('gray').text('Esta orden no contiene materiales', 50, y + 10, { width: 510, align: 'center' });
        y += 30;
      } else {
        order.items.forEach((item, index) => {
          doc.rect(50, y, 510, 25).stroke();
          doc.fillColor('black').fontSize(9);
          doc.font('Helvetica').text(index + 1, colX[0], y + 7, { width: colWidths[0], align: 'center' });
          doc.font('Helvetica').text(item.material?.material_code || item.material?.internal_code || '', colX[1], y + 7, { width: colWidths[1], align: 'left' });
          doc.font('Helvetica').text(item.material?.name || '', colX[2], y + 7, { width: colWidths[2], align: 'left', height: 15, ellipsis: true });
          
          let folio = item.lote?.folio || 'N/A';
          // Si es entrada manual generada por el sistema (S/N-...), poner un código abreviado
          if (folio.startsWith('S/N-')) {
            const timestamp = folio.split('-')[1];
            folio = timestamp ? `E-MNL-${timestamp.slice(-4)}` : 'E-MNL';
          }
          
          doc.font('Helvetica').text(folio, colX[3], y + 7, { width: colWidths[3], align: 'center' });
          
          const qty = parseFloat(item.requested_quantity).toFixed(2);
          const unit = item.unit?.code || item.material?.base_unit?.code || item.unit?.abbreviation || 'KG';
          doc.font('Helvetica-Bold').text(`${qty} ${unit}`, colX[4], y + 7, { width: colWidths[4] - 5, align: 'right' });
          
          y += 25;
        });
      }

      // Signatures
      const requesterName = order.requester?.name 
        ? order.requester.name 
        : [order.requester?.first_name || '', order.requester?.last_name || ''].filter(Boolean).join(' ').trim();

      let adminAlmName = order.admin_alm?.name;
      if (!adminAlmName) {
        if (order.resolver?.first_name) {
          adminAlmName = `${order.resolver.first_name} ${order.resolver.last_name || ''}`.trim();
        } else {
          try {
            const { User, Role } = require('../../../database/models');
            const adminUser = await User.findOne({
              include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }]
            });
            if (adminUser) {
              adminAlmName = `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim() || adminUser.username;
            }
          } catch (e) {
            console.error('Error fetching admin_alm for pdf:', e);
          }
        }
      }
      if (!adminAlmName) adminAlmName = 'Administrador ALM';

      if (doc.y > 620) {
        doc.addPage();
        doc.y = 50;
      } else {
        doc.moveDown(4);
      }
      const signatureY = doc.y + 10;

      // 1. Autoriza
      doc.moveTo(50, signatureY).lineTo(195, signatureY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Autoriza', 45, signatureY + 6, { width: 155, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#666666').text('Nombre y Firma', 45, signatureY + 20, { width: 155, align: 'center' });

      // 2. Solicita
      doc.moveTo(233, signatureY).lineTo(378, signatureY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Solicita', 228, signatureY + 6, { width: 155, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('black').text(requesterName || 'Nombre y Firma', 228, signatureY + 20, { width: 155, align: 'center' });

      // 3. Autoriza/almacen
      doc.moveTo(416, signatureY).lineTo(561, signatureY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Autoriza/almacen', 411, signatureY + 6, { width: 155, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('black').text(adminAlmName, 411, signatureY + 20, { width: 155, align: 'center' });

      // 4. Si la orden contiene items con QR Hijo, agregar páginas con etiquetas de mini-lotes listas para imprimir
      const itemsWithChild = (order.items || []).filter(item => item.child_qr && item.child_qr.qr_code);

      if (itemsWithChild.length > 0) {
        doc.addPage();
        
        const areaName = (order.requesting_area?.name || 'EXTRUSIÓN').toUpperCase();
        
        // Cabecera de la sección de etiquetas
        doc.fontSize(16).font('Helvetica-Bold').fillColor('black').text('ETIQUETAS QR DE MINI-LOTES (WIP)', 50, 40, { align: 'left' });
        doc.fontSize(9).font('Helvetica').fillColor('gray').text(`Etiquetas listas para imprimir y adherir en sacos/tarimas • Orden ${order.order_number}`, 50, 60, { align: 'left' });
        doc.moveTo(50, 75).lineTo(560, 75).stroke();

        const labelWidth = 245;
        const labelHeight = 135;
        const startX = 50;
        const gapX = 20;
        const startY = 90;
        const gapY = 15;
        const labelsPerPage = 8; // 2 columnas x 4 filas = 8 etiquetas por hoja carta

        for (let i = 0; i < itemsWithChild.length; i++) {
          const pageIndex = i % labelsPerPage;
          if (i > 0 && pageIndex === 0) {
            doc.addPage();
            doc.fontSize(16).font('Helvetica-Bold').fillColor('black').text('ETIQUETAS QR DE MINI-LOTES (WIP) - Continuación', 50, 40, { align: 'left' });
            doc.moveTo(50, 65).lineTo(560, 65).stroke();
          }

          const col = pageIndex % 2;
          const row = Math.floor(pageIndex / 2);
          const currentYOffset = (i >= labelsPerPage) ? 80 : startY;
          const x = startX + col * (labelWidth + gapX);
          const y = currentYOffset + row * (labelHeight + gapY);

          const item = itemsWithChild[i];
          const childCode = item.child_qr.qr_code;
          const parentFolio = item.lote?.folio || (item.lote?.qr_code?.qr_code ? item.lote.qr_code.qr_code : 'S/N');
          const qty = Number(item.fulfilled_quantity || item.requested_quantity || 0).toFixed(2);
          const unit = item.unit?.code || item.material?.base_unit?.code || 'KG';

          // Marco de la etiqueta
          doc.roundedRect(x, y, labelWidth, labelHeight, 8).lineWidth(1).stroke('#333333');

          // Franja superior de encabezado
          doc.rect(x, y, labelWidth, 20).fill('#f0f4f8');
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#004b87').text(`${areaName} — INSUMO WIP`, x + 8, y + 6);
          doc.fontSize(7.5).font('Courier-Bold').fillColor('#555555').text(order.order_number, x + labelWidth - 75, y + 6, { width: 67, align: 'right' });

          // Generar imagen QR
          try {
            const qrDataUrl = await QRCode.toDataURL(childCode, { errorCorrectionLevel: 'M', margin: 1 });
            doc.image(qrDataUrl, x + 6, y + 25, { width: 75, height: 75 });
          } catch (qrErr) {
            console.error('Error generating QR image:', qrErr);
          }

          // Detalles de texto de la etiqueta
          const textX = x + 86;
          let textY = y + 26;

          doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
          doc.text(item.material?.name || 'Material', textX, textY, { width: labelWidth - 92, height: 22, ellipsis: true });
          textY += 24;

          doc.fontSize(7.5).font('Helvetica').fillColor('#555555');
          if (item.material?.material_code || item.material?.internal_code) {
            doc.text(`Cód: ${item.material?.material_code || item.material?.internal_code}`, textX, textY);
            textY += 11;
          }

          doc.text(`Lote Padre: ${parentFolio}`, textX, textY, { width: labelWidth - 92, ellipsis: true });
          textY += 12;

          doc.fontSize(10).font('Helvetica-Bold').fillColor('#006622').text(`Cant: ${qty} ${unit}`, textX, textY);
          textY += 14;

          // Código QR Hijo en texto mono en la parte inferior
          doc.fontSize(7).font('Courier-Bold').fillColor('#111111').text(childCode, x + 6, y + labelHeight - 14, { width: labelWidth - 12, align: 'center' });
        }
      }

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
