const extrusionService = require('./extrusion.service');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { encryptQrData } = require('../../shared/utils/crypto.utils');
const { canViewCosts } = require('../../shared/security/accessRules');

class ExtrusionController {
  async mixFormula(req, res, next) {
    try {
      // payload needs: formula_id, destination_qr_code, inputs: [{qr_code, quantity}]
      const result = await extrusionService.mixFormula({
        ...req.body,
        area_id: req.user.area_id
      }, req.user.id);

      return res.status(201).json({
        success: true,
        message: 'Mezcla generada exitosamente.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormulas(req, res, next) {
    try {
      const formulas = await extrusionService.getFormulas();
      return res.status(200).json({
        success: true,
        data: formulas
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormulaDetails(req, res, next) {
    try {
      const formula = await extrusionService.getFormulaDetails(req.params.id);
      return res.status(200).json({
        success: true,
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  async getWipChildQr(req, res, next) {
    try {
      const result = await extrusionService.getWipChildQr(req.params.qrCode);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async createMixRequest(req, res, next) {
    try {
      const preparation = await extrusionService.createMixRequest(req.body, req.user.id);
      return res.status(201).json({
        success: true,
        message: 'Solicitud de mezcla creada',
        data: preparation
      });
    } catch (error) {
      next(error);
    }
  }

  async getMixRequests(req, res, next) {
    try {
      const status = req.query.status || 'SOLICITADA';
      const requests = await extrusionService.getMixRequests(status);
      return res.status(200).json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  async getPreparedMixHistory(req, res, next) {
    try {
      const history = await extrusionService.getPreparedMixHistory(req.query);
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  async getMixContainersByQrOrFolio(req, res, next) {
    try {
      const { identifier } = req.params;
      const result = await extrusionService.getMixContainersByQrOrFolio(identifier);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PISO DE EXTRUSIÓN & CONTROL DE COLAS (FASE 2)
  // ==========================================

  async switchQueue(req, res, next) {
    try {
      const result = await extrusionService.switchQueuePriority({
        ...req.body,
        userId: req.user?.id || 1
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async scanRack(req, res, next) {
    try {
      const result = await extrusionService.scanRackPti({
        ...req.body,
        userId: req.user?.id || 1
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueues(req, res, next) {
    try {
      const queues = await extrusionService.getExtruderQueues();
      return res.status(200).json({
        success: true,
        data: queues
      });
    } catch (error) {
      next(error);
    }
  }

  async getPurgeMaterials(req, res, next) {
    try {
      const materials = await extrusionService.getPurgeMaterialCatalog();
      return res.status(200).json({ success: true, data: materials });
    } catch (error) { next(error); }
  }

  async getPurgeMaterialLots(req, res, next) {
    try {
      const lots = await extrusionService.getPurgeMaterialLots(req.params.materialId);
      return res.status(200).json({ success: true, data: lots });
    } catch (error) { next(error); }
  }

  async enqueueMix(req, res, next) {
    try {
      const result = await extrusionService.enqueueMix(req.body);
      return res.status(201).json({
        success: true,
        message: 'Mezcla agregada a la cola exitosamente.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getRacks(req, res, next) {
    try {
      const racks = await extrusionService.getPtiRacks();
      return res.status(200).json({
        success: true,
        data: racks
      });
    } catch (error) {
      next(error);
    }
  }

  async createRack(req, res, next) {
    try {
      const rack = await extrusionService.createPtiRack(req.body);
      return res.status(201).json({
        success: true,
        message: `Rack ${rack.rack_code} creado exitosamente.`,
        data: rack
      });
    } catch (error) {
      next(error);
    }
  }

  async getExtrusionFormulas(req, res, next) {
    try {
      const formulas = await extrusionService.getExtrusionFormulas(req.query);
      return res.status(200).json({
        success: true,
        data: formulas
      });
    } catch (error) {
      next(error);
    }
  }

  async createFormula(req, res, next) {
    try {
      const formula = await extrusionService.createFormula(req.body);
      return res.status(201).json({
        success: true,
        message: 'Fórmula creada inactiva. Completa sus ingredientes antes de activarla.',
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  async registerScrap(req, res, next) {
    try {
      const result = await extrusionService.registerOperationalScrap({
        ...req.body,
        userId: req.user?.id || 1
      });
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMassBalance(req, res, next) {
    try {
      const { mixQr } = req.params;
      const balance = await extrusionService.getMassBalance(mixQr);
      return res.status(200).json({
        success: true,
        data: balance
      });
    } catch (error) {
      next(error);
    }
  }

  async getScrapLogs(req, res, next) {
    try {
      const logs = await extrusionService.getScrapLogs(req.query);
      return res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustScrapWeight(req, res, next) {
    try {
      const result = await extrusionService.adjustScrapWeight({
        ...req.body,
        scrap_log_id: req.params.id,
        userId: req.user?.id,
      });
      return res.status(200).json({ success: true, message: 'Pesaje de scrap actualizado con auditoría.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async closeExtrusionShift(req, res, next) {
    try {
      const closure = await extrusionService.closeExtrusionShift({ ...req.body, userId: req.user?.id });
      return res.status(201).json({ success: true, message: 'Turno conciliado y cerrado.', data: closure });
    } catch (error) {
      next(error);
    }
  }

  async adjustProductionEntry(req, res, next) {
    try {
      const entry = await extrusionService.adjustProductionEntry({
        ...req.body,
        production_entry_id: req.params.id,
        userId: req.user?.id,
      });
      return res.status(200).json({ success: true, message: 'Producción corregida con auditoría.', data: entry });
    } catch (error) {
      next(error);
    }
  }

  async getExtrusionWip(req, res, next) {
    try {
      const roleCode = String(req.user?.role?.code || '').toUpperCase();
      const includeFinancials = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode);
      const result = await extrusionService.getExtrusionWip({ includeFinancials });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async downloadWipQrLabelsPdf(req, res, next) {
    try {
      const labels = await extrusionService.getWipQrLabelsForPdf(req.body?.uuids);
      const pdfBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: false });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const renderLabel = async (label, x, y, width, height, large = false) => {
          doc.roundedRect(x + 4, y + 4, width - 8, height - 8, 8).lineWidth(0.8).strokeColor('#94a3b8').stroke();
          const titleY = y + (large ? 22 : 10);
          doc.font('Helvetica-Bold').fontSize(large ? 18 : 9.5).fillColor('#111827')
            .text(label.material_name || 'Material WIP', x + 10, titleY, { width: width - 20, align: 'center', ellipsis: true });
          const infoY = titleY + (large ? 24 : 13);
          doc.font('Helvetica').fontSize(large ? 12 : 7.5).fillColor('#374151')
            .text(`${label.material_code || ''} · ${Number(label.quantity_kg).toLocaleString('es-MX', { maximumFractionDigits: 3 })} kg`, x + 8, infoY, { width: width - 16, align: 'center', ellipsis: true });

          const qrSize = large ? Math.min(width - 72, 270) : Math.min(width - 56, height - 52);
          const qrX = x + (width - qrSize) / 2;
          const qrY = infoY + (large ? 18 : 11);
          const payload = encryptQrData(label.qr_code);
          const dataUrl = await QRCode.toDataURL(payload, {
            width: large ? 600 : 320,
            margin: 1,
            errorCorrectionLevel: 'H',
            color: { dark: '#000000', light: '#ffffff' },
          });
          doc.image(dataUrl, qrX, qrY, { width: qrSize, height: qrSize });
          const codeY = qrY + qrSize + (large ? 18 : 5);
          doc.font('Helvetica-Bold').fontSize(large ? 10 : 6.6).fillColor('#111827')
            .text(label.qr_code, x + 8, codeY, { width: width - 16, align: 'center', ellipsis: true });
          if (large) {
            doc.font('Helvetica').fontSize(9).fillColor('#64748b')
              .text('WIP · Extrusión', x + 8, codeY + 19, { width: width - 16, align: 'center' });
          }
        };

        (async () => {
          try {
            if (labels.length === 1) {
              const width = 390;
              const height = 460;
              await renderLabel(labels[0], (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, true);
            } else {
              const marginX = 24;
              const marginY = 24;
              const columns = 2;
              const rowsPerPage = 5;
              const gap = 4;
              const cellWidth = (pageWidth - marginX * 2 - gap) / columns;
              const cellHeight = (pageHeight - marginY * 2 - gap * (rowsPerPage - 1)) / rowsPerPage;
              for (let index = 0; index < labels.length; index += 1) {
                const position = index % (columns * rowsPerPage);
                if (index > 0 && position === 0) doc.addPage({ size: 'A4', margin: 0 });
                const column = position % columns;
                const row = Math.floor(position / columns);
                await renderLabel(
                  labels[index],
                  marginX + column * (cellWidth + gap),
                  marginY + row * (cellHeight + gap),
                  cellWidth,
                  cellHeight,
                );
              }
            }
            doc.end();
          } catch (error) {
            reject(error);
          }
        })();
      });

      const fileName = labels.length === 1 ? 'QR-WIP-Extrusion.pdf' : `QR-seleccion-WIP-Extrusion-${labels.length}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(pdfBuffer);
    } catch (error) {
      return next(error);
    }
  }

  async updatePtiRackPrice(req, res, next) {
    try {
      const { id } = req.params;
      const rack = await extrusionService.updatePtiRackPrice(id, req.body);
      return res.status(200).json({
        success: true,
        message: `Rack ${rack.rack_code} actualizado correctamente.`,
        data: rack
      });
    } catch (error) {
      next(error);
    }
  }

  async splitMixtureContainers(req, res, next) {
    try {
      const result = await extrusionService.splitMixtureContainers({
        ...req.body,
        userId: req.user?.id || 1
      });
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async recordMixtureTransition(req, res, next) {
    try {
      const result = await extrusionService.recordMixtureTransition({
        ...req.body,
        userId: req.user?.id || 1
      });
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getExtrusionValuation(req, res, next) {
    try {
      const result = await extrusionService.getExtrusionValuation(req.query);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FÓRMULAS & ÍNDICE DE MULTIPLICACIÓN
  // ==========================================

  async updateFormula(req, res, next) {
    try {
      const formula = await extrusionService.updateFormula(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Fórmula actualizada exitosamente.',
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormulaById(req, res, next) {
    try {
      const formula = await extrusionService.getFormulaDetailsById(req.params.id);
      return res.status(200).json({
        success: true,
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CATÁLOGO DE PRODUCTOS TERMINADOS INTERMEDIOS (PTI)
  // ==========================================

  async getPtiProducts(req, res, next) {
    try {
      const ptiProducts = await extrusionService.getPtiProducts(req.query);
      return res.status(200).json({
        success: true,
        data: ptiProducts
      });
    } catch (error) {
      next(error);
    }
  }

  async getPtiProductById(req, res, next) {
    try {
      const ptiProduct = await extrusionService.getPtiProductById(req.params.id);
      return res.status(200).json({
        success: true,
        data: ptiProduct
      });
    } catch (error) {
      next(error);
    }
  }

  async createPtiProduct(req, res, next) {
    try {
      const ptiProduct = await extrusionService.createPtiProduct(req.body);
      return res.status(201).json({
        success: true,
        message: 'Producto PTI registrado exitosamente en el catálogo.',
        data: ptiProduct
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePtiProduct(req, res, next) {
    try {
      const ptiProduct = await extrusionService.updatePtiProduct(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Producto PTI actualizado exitosamente.',
        data: ptiProduct
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePtiProduct(req, res, next) {
    try {
      const result = await extrusionService.deletePtiProduct(req.params.id);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CATÁLOGO DE MÁQUINAS, SILOS & TOGGLE HÍBRIDO
  // ==========================================

  async getMachines(req, res, next) {
    try {
      const machines = await extrusionService.getMachines();
      return res.status(200).json({
        success: true,
        data: machines
      });
    } catch (error) {
      next(error);
    }
  }

  async createMachine(req, res, next) {
    try {
      const machine = await extrusionService.createMachine(req.body || {});
      return res.status(201).json({ success: true, data: machine, message: 'Extrusora creada.' });
    } catch (error) {
      next(error);
    }
  }

  async updateMachine(req, res, next) {
    try {
      const machine = await extrusionService.updateMachine(req.params.id, req.body);
      return res.status(200).json({ success: true, data: machine, message: 'Extrusora actualizada.' });
    } catch (error) {
      next(error);
    }
  }

  async updateMachineFormulaCompatibility(req, res, next) {
    try {
      const machines = await extrusionService.updateMachineFormulaCompatibility(req.params.id, req.body.formula_ids || []);
      const machine = machines.find((item) => Number(item.id) === Number(req.params.id));
      return res.status(200).json({ success: true, data: machine, message: 'Compatibilidad de recetas actualizada.' });
    } catch (error) {
      next(error);
    }
  }

  async getSilos(req, res, next) {
    try {
      const allowCosts = canViewCosts(req.user);
      const silos = await extrusionService.getSilos(req.user, req.query.purpose);

      let totalStockKg = 0;
      let totalCapacityKg = 0;
      let totalInvestment = 0;
      let criticalCount = 0;
      let alertCount = 0;
      const byTag = {};

      for (const s of silos) {
        const stock = Number(s.current_stock_kg) || 0;
        const cap = Number(s.capacity_kg) || 0;
        const inv = allowCosts ? Number(s.total_investment) || 0 : 0;
        totalStockKg += stock;
        totalCapacityKg += cap;
        totalInvestment += inv;
        if (s.is_critical_reorder) criticalCount++;
        if (s.is_stock_alert) alertCount++;

        const tagName = s.materialTag?.name || 'SIN_ETIQUETA';
        if (!byTag[tagName]) {
          byTag[tagName] = { tag: tagName, stock_kg: 0, total_investment: allowCosts ? 0 : null, count: 0, silos: [] };
        }
        byTag[tagName].stock_kg += stock;
        if (allowCosts) byTag[tagName].total_investment += inv;
        byTag[tagName].count += 1;
        byTag[tagName].silos.push(s.name || s.code);
      }

      return res.status(200).json({
        success: true,
        data: silos,
        summary: {
          total_stock_kg: Number(totalStockKg.toFixed(2)),
          total_capacity_kg: Number(totalCapacityKg.toFixed(2)),
          total_investment: allowCosts ? Number(totalInvestment.toFixed(2)) : null,
          critical_silos_count: criticalCount,
          alert_silos_count: alertCount,
          by_tag: byTag
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async createSilo(req, res, next) {
    try {
      const silo = await extrusionService.createSilo(req.body);
      return res.status(201).json({
        success: true,
        message: 'Silo creado exitosamente.',
        data: silo
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSilo(req, res, next) {
    try {
      const silo = await extrusionService.updateSilo(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Silo actualizado exitosamente.',
        data: silo
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSilo(req, res, next) {
    try {
      const result = await extrusionService.deleteSilo(req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async receiveSiloInvoiceEntry(req, res, next) {
    try {
      const result = await extrusionService.receiveSiloInvoiceEntry(req.body, req.user?.id || 1);
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.silo
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExtrusionController();
