const PDFDocument = require('pdfkit');

// Helper to format currency
function formatCurrency(val) {
  const num = Number(val) || 0;
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to format numbers
function formatNumber(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

// Draw Corporate Header dynamically with NO text overlapping
function drawCorporateHeader(doc, title, subtitle, periodText, user) {
  const pageWidth = doc.page.width;
  
  // Top primary accent bar
  doc.rect(0, 0, pageWidth, 5).fill('#2563eb');

  // Metadata Box on Right
  const metaW = 190;
  const metaX = pageWidth - 40 - metaW;
  const metaY = 16;
  const metaH = 68;
  doc.rect(metaX, metaY, metaW, metaH).fillAndStroke('#f8fafc', '#cbd5e1');
  
  doc.fillColor('#334155').fontSize(7).font('Helvetica-Bold').text('PERÍODO AUDITADO:', metaX + 8, metaY + 6);
  doc.fillColor('#0f172a').fontSize(7).font('Helvetica').text(periodText, metaX + 8, metaY + 16, { width: metaW - 16, height: 14, ellipsis: true });

  doc.fillColor('#334155').fontSize(7).font('Helvetica-Bold').text('FECHA DE EMISIÓN:', metaX + 8, metaY + 33);
  const nowStr = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(nowStr, metaX + 8, metaY + 43, { width: metaW - 16, height: 10, ellipsis: true });

  const issuerName = user ? `${user.first_name || user.username || 'Usuario'} (${user.role?.code || user.role || 'ADMIN'})` : 'Administración';
  doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Oblique').text(`Emitido por: ${issuerName}`, metaX + 8, metaY + 54, { width: metaW - 16, height: 10, ellipsis: true });

  // Left Branding and Titles
  const leftW = metaX - 55;
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('TRACEFLOW INDUSTRIAL CORE', 40, 18);
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('Sistema Integral de Control de Planta y Gestión de Almacén', 40, 33);

  // Document Title (with dynamic Y)
  doc.fillColor('#1e293b').fontSize(10.5).font('Helvetica-Bold').text(title, 40, 48, { width: leftW });
  
  if (subtitle) {
    const subtitleY = doc.y + 2;
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(subtitle, 40, subtitleY, { width: leftW });
  }

  // Separator Line
  const sepY = Math.max(doc.y + 8, metaY + metaH + 8);
  doc.moveTo(40, sepY).lineTo(pageWidth - 40, sepY).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
  doc.y = sepY + 12;
}

// Draw Metric Cards with generous height, bounded text, and ZERO overlap
function drawKpiCards(doc, cards, startY) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 80;
  const gap = 8;
  const count = cards.length;
  const cardWidth = (contentWidth - (gap * (count - 1))) / count;
  const cardHeight = 54;

  cards.forEach((card, index) => {
    const x = 40 + (index * (cardWidth + gap));
    // Card Box
    doc.rect(x, startY, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0');
    // Top colored indicator line
    doc.rect(x, startY, cardWidth, 3).fill(card.color || '#2563eb');

    // Title: Single bounded row
    doc.fillColor('#475569').fontSize(6.5).font('Helvetica-Bold').text(card.title.toUpperCase(), x + 6, startY + 7, { width: cardWidth - 12, height: 9, ellipsis: true });
    
    // Value: High-contrast value with dedicated space and auto-scaling for long strings
    let valFontSize = 11;
    if (typeof card.value === 'string') {
      if (card.value.length >= 18) valFontSize = 7.5;
      else if (card.value.length > 13) valFontSize = 8.5;
    }
    const valYOffset = valFontSize <= 8 ? 23 : valFontSize < 11 ? 22 : 21;
    doc.fillColor(card.valueColor || '#0f172a').fontSize(valFontSize).font('Helvetica-Bold').text(card.value, x + 6, startY + valYOffset, { width: cardWidth - 12, height: 14, ellipsis: true });
    
    // Subtitle: Uncluttered note
    if (card.subtitle) {
      doc.fillColor('#64748b').fontSize(6.5).font('Helvetica').text(card.subtitle, x + 6, startY + 38, { width: cardWidth - 12, height: 9, ellipsis: true });
    }
  });

  doc.y = startY + cardHeight + 16;
}

// Draw Executive Signatures Block
function drawSignaturesBlock(doc, signers) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  if (doc.y > pageHeight - 95) {
    doc.addPage();
    doc.y = 50;
  } else {
    doc.moveDown(1.5);
  }

  const startY = Math.max(doc.y + 12, pageHeight - 75);
  const contentWidth = pageWidth - 80;
  const count = signers.length;
  const sigWidth = 145;
  const totalSigsWidth = count * sigWidth;
  const spacing = Math.max(10, (contentWidth - totalSigsWidth) / (count + 1));

  signers.forEach((signer, idx) => {
    const x = 40 + spacing + (idx * (sigWidth + spacing));
    // Signature line
    doc.moveTo(x, startY).lineTo(x + sigWidth, startY).strokeColor('#94a3b8').lineWidth(1).stroke();
    // Role title
    doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(signer.title, x, startY + 5, { width: sigWidth, align: 'center' });
    // Signer name
    doc.fillColor('#334155').fontSize(7).font('Helvetica').text(signer.name || 'Nombre y Firma', x, startY + 15, { width: sigWidth, align: 'center' });
    if (signer.subtitle) {
      doc.fillColor('#94a3b8').fontSize(6).font('Helvetica-Oblique').text(signer.subtitle, x, startY + 24, { width: sigWidth, align: 'center' });
    }
  });
}

// -----------------------------------------------------------------------------
// 1. GENERATE MONTHLY REPORT PDF
// -----------------------------------------------------------------------------
async function generateMonthlyReportPdf(data, filters, user, res) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true });
      doc.pipe(res);

      const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const monthLabel = (!filters.month || filters.month === 'all') ? 'Todo el Año' : monthNames[parseInt(filters.month, 10)] || filters.month;
      const periodText = `${filters.year || new Date().getFullYear()} · ${monthLabel}`;

      // 1. Corporate Header
      drawCorporateHeader(
        doc,
        'REPORTE EJECUTIVO MENSUAL DE ALMACÉN Y BALANCES',
        'Consolidado de ingresos, consumos operativos, pérdidas valorizadas y balance neto',
        periodText,
        user
      );

      // Extract KPIs safely (support both camelCase and snake_case)
      const kpis = data.kpis || {};
      const totalIncomeCost = kpis.totalIncomeCost ?? kpis.total_purchases_cost ?? 0;
      const totalIncomeQty = kpis.totalIncomeQty ?? kpis.total_purchases_qty ?? 0;
      const totalConsumptionCost = kpis.totalConsumptionCost ?? kpis.total_consumption_cost ?? 0;
      const totalConsumptionQty = kpis.totalConsumptionQty ?? kpis.total_consumption_qty ?? 0;
      const totalWasteCost = kpis.totalWasteCost ?? kpis.total_losses_cost ?? ((kpis.mermaCost || 0) + (kpis.scrapCost || 0) + (kpis.bajaCost || 0));
      const totalWasteQty = kpis.totalWasteQty ?? kpis.total_losses_qty ?? ((kpis.mermaQty || 0) + (kpis.scrapQty || 0) + (kpis.bajaQty || 0));
      const devolucionCost = kpis.devolucionCost ?? kpis.totalDevolucionCost ?? kpis.total_devoluciones_cost ?? 0;
      const devolucionQty = kpis.devolucionQty ?? kpis.totalDevolucionQty ?? kpis.total_devoluciones_qty ?? 0;
      const netBalanceCost = kpis.netBalanceCost ?? kpis.net_balance_cost ?? (totalIncomeCost - totalConsumptionCost - totalWasteCost - devolucionCost);
      const turnoverRate = kpis.turnoverRatePct ?? kpis.inventory_turnover_ratio ?? 0;

      // 2. KPI Cards (Single-line crisp titles)
      const kpiCards = [
        { title: 'INGRESOS', value: formatCurrency(totalIncomeCost), subtitle: `Vol: ${formatNumber(totalIncomeQty)} uds`, color: '#2563eb' },
        { title: 'CONSUMOS', value: formatCurrency(totalConsumptionCost), subtitle: `Despacho: ${formatNumber(totalConsumptionQty)} uds`, color: '#10b981' },
        { title: 'MERMA Y SCRAP', value: formatCurrency(totalWasteCost), subtitle: `Pérdida: ${formatNumber(totalWasteQty)} uds`, color: '#ef4444', valueColor: '#b91c1c' },
        { title: 'DEVOLUCIONES', value: formatCurrency(devolucionCost), subtitle: `Devuelto: ${formatNumber(devolucionQty)} uds`, color: '#f59e0b' },
        { title: 'BALANCE NETO', value: formatCurrency(netBalanceCost), subtitle: `Rotación: ${turnoverRate}x`, color: '#8b5cf6' }
      ];
      drawKpiCards(doc, kpiCards, doc.y);

      // Extract Trends safely
      const trends = data.monthlyTrends || data.trends || [];

      // 3. Vector Chart: Comparativa Mensual de Movimientos
      const chartY = doc.y;
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('TENDENCIA MENSUAL DE MOVIMIENTOS Y BALANCES', 40, chartY);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Comparativa valorizada de ingresos ($) vs consumos ($) vs pérdidas ($)', 40, chartY + 11);

      const chartBoxY = chartY + 24;
      const chartWidth = doc.page.width - 80;
      const chartHeight = 95;
      doc.rect(40, chartBoxY, chartWidth, chartHeight).fillAndStroke('#ffffff', '#e2e8f0');

      // Calculate max value across months
      const maxVal = Math.max(1000, ...trends.map(t => {
        const inc = t.entriesCost ?? t.purchases_cost ?? 0;
        const con = t.consumptionsCost ?? t.consumption_cost ?? 0;
        const wst = t.wasteCost ?? t.losses_cost ?? ((t.mermaCost || 0) + (t.scrapCost || 0) + (t.bajaCost || 0));
        return Math.max(inc, con, wst);
      }));

      // Grid Lines
      const gridLevels = [0, 0.33, 0.66, 1];
      gridLevels.forEach(lvl => {
        const lineY = chartBoxY + chartHeight - 18 - (lvl * (chartHeight - 32));
        doc.moveTo(80, lineY).lineTo(40 + chartWidth - 10, lineY).strokeColor('#f1f5f9').lineWidth(0.8).stroke();
        const labelVal = formatCurrency(maxVal * lvl);
        doc.fillColor('#94a3b8').fontSize(6).font('Helvetica').text(labelVal, 42, lineY - 3, { width: 35, align: 'right' });
      });

      // Draw Bars for each month
      const monthsCount = trends.length || 12;
      const colWidth = (chartWidth - 65) / monthsCount;
      const barW = Math.min(6, (colWidth - 6) / 3);

      trends.forEach((item, idx) => {
        const xBase = 84 + (idx * colWidth);
        const groundY = chartBoxY + chartHeight - 18;

        const inc = item.entriesCost ?? item.purchases_cost ?? 0;
        const con = item.consumptionsCost ?? item.consumption_cost ?? 0;
        const wst = item.wasteCost ?? item.losses_cost ?? ((item.mermaCost || 0) + (item.scrapCost || 0) + (item.bajaCost || 0));

        // 1. Purchases Bar (Blue)
        const pHeight = Math.min(chartHeight - 32, (inc / maxVal) * (chartHeight - 32));
        if (pHeight > 0) {
          doc.rect(xBase, groundY - pHeight, barW, pHeight).fill('#2563eb');
        }

        // 2. Consumption Bar (Green)
        const cHeight = Math.min(chartHeight - 32, (con / maxVal) * (chartHeight - 32));
        if (cHeight > 0) {
          doc.rect(xBase + barW + 1, groundY - cHeight, barW, cHeight).fill('#10b981');
        }

        // 3. Losses Bar (Red)
        const lHeight = Math.min(chartHeight - 32, (wst / maxVal) * (chartHeight - 32));
        if (lHeight > 0) {
          doc.rect(xBase + (barW * 2) + 2, groundY - lHeight, barW, lHeight).fill('#ef4444');
        }

        // Month label
        const monthShort = (item.monthName || item.month_name || `M${idx + 1}`).substring(0, 3);
        doc.fillColor('#475569').fontSize(6).font('Helvetica-Bold').text(monthShort, xBase - 2, groundY + 4, { width: colWidth, align: 'left' });
      });

      // Chart Legend (Well spaced)
      const legY = chartBoxY + 6;
      const legX = 40 + chartWidth - 200;
      doc.rect(legX, legY, 7, 7).fill('#2563eb');
      doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text('Ingresos', legX + 11, legY + 0.5);
      doc.rect(legX + 60, legY, 7, 7).fill('#10b981');
      doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text('Consumos', legX + 71, legY + 0.5);
      doc.rect(legX + 125, legY, 7, 7).fill('#ef4444');
      doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text('Pérdidas', legX + 136, legY + 0.5);

      doc.y = chartBoxY + chartHeight + 14;

      // 4. Formatted Data Table (Desglose Mes a Mes)
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('TABLA DETALLADA DE MOVIMIENTOS MENSUALES', 40, doc.y);
      doc.moveDown(0.4);

      const tableTop = doc.y;
      const headers = ['Mes', 'Ingresos ($)', 'Vol. Ingreso', 'Consumos ($)', 'Vol. Consumo', 'Pérdidas ($)', 'Devolución ($)', 'Balance Neto ($)'];
      const colWidths = [55, 68, 62, 68, 62, 68, 68, 81];
      const colAligns = ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];

      // Table Header Row
      let curX = 40;
      doc.rect(40, tableTop, chartWidth, 16).fill('#1e293b');
      headers.forEach((h, i) => {
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold').text(h, curX + 3, tableTop + 4.5, { width: colWidths[i] - 6, align: colAligns[i] });
        curX += colWidths[i];
      });

      let rowY = tableTop + 16;
      trends.forEach((row, rowIndex) => {
        // Add new page if overflowing
        if (rowY > doc.page.height - 85) {
          doc.addPage();
          drawCorporateHeader(doc, 'REPORTE EJECUTIVO MENSUAL DE ALMACÉN Y BALANCES (CONT.)', '', periodText, user);
          rowY = doc.y + 10;
        }

        const isAlt = rowIndex % 2 === 1;
        doc.rect(40, rowY, chartWidth, 13).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', '#e2e8f0');

        curX = 40;
        const inc = row.entriesCost ?? row.purchases_cost ?? 0;
        const incQty = row.entriesQty ?? row.purchases_qty ?? 0;
        const con = row.consumptionsCost ?? row.consumption_cost ?? 0;
        const conQty = row.consumptionsQty ?? row.consumption_qty ?? 0;
        const wst = row.wasteCost ?? row.losses_cost ?? ((row.mermaCost || 0) + (row.scrapCost || 0) + (row.bajaCost || 0));
        const dev = row.devolucionCost ?? row.devoluciones_cost ?? 0;
        const bal = row.netBalanceCost ?? row.net_balance_cost ?? (inc - con - wst - dev);

        const rowCells = [
          row.monthName || row.month_name || `Mes ${rowIndex + 1}`,
          formatCurrency(inc),
          `${formatNumber(incQty)} u`,
          formatCurrency(con),
          `${formatNumber(conQty)} u`,
          formatCurrency(wst),
          formatCurrency(dev),
          formatCurrency(bal)
        ];

        rowCells.forEach((cell, i) => {
          const font = i === 0 || i === 7 ? 'Helvetica-Bold' : 'Helvetica';
          const color = i === 5 && (wst > 0) ? '#b91c1c' : i === 7 ? (bal >= 0 ? '#15803d' : '#b91c1c') : '#1e293b';
          doc.fillColor(color).fontSize(6).font(font).text(cell, curX + 3, rowY + 3.5, { width: colWidths[i] - 6, align: colAligns[i] });
          curX += colWidths[i];
        });

        rowY += 13;
      });

      // Total Summary Row
      doc.rect(40, rowY, chartWidth, 15).fillAndStroke('#f1f5f9', '#cbd5e1');
      curX = 40;
      const totalCells = [
        'TOTAL',
        formatCurrency(totalIncomeCost),
        `${formatNumber(totalIncomeQty)} u`,
        formatCurrency(totalConsumptionCost),
        `${formatNumber(totalConsumptionQty)} u`,
        formatCurrency(totalWasteCost),
        formatCurrency(devolucionCost),
        formatCurrency(netBalanceCost)
      ];
      totalCells.forEach((cell, i) => {
        doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(cell, curX + 3, rowY + 4, { width: colWidths[i] - 6, align: colAligns[i] });
        curX += colWidths[i];
      });

      doc.y = rowY + 20;

      // 5. Signatures Block
      drawSignaturesBlock(doc, [
        { title: 'Elaboró / Responsable de Almacén', name: 'Jefatura de Almacén', subtitle: 'ADMIN_ALM' },
        { title: 'Revisó / Auditoría Operativa', name: 'Supervisión de Calidad', subtitle: 'QA / Auditoría' },
        { title: 'Autorizó / Dirección General', name: 'Gerencia General', subtitle: 'Dirección de Operaciones' }
      ]);

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// -----------------------------------------------------------------------------
// 2. GENERATE SUPPLIERS REPORT PDF (MATERIA PRIMA MP)
// -----------------------------------------------------------------------------
async function generateSuppliersReportPdf(data, filters, user, res) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true });
      doc.pipe(res);

      const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const monthLabel = (!filters.month || filters.month === 'all') ? 'Todo el Año' : monthNames[parseInt(filters.month, 10)] || filters.month;
      const periodText = `${filters.year || new Date().getFullYear()} · ${monthLabel}`;

      // 1. Header
      drawCorporateHeader(
        doc,
        'REPORTE GERENCIAL: PROVEEDORES DE MATERIA PRIMA (MP)',
        'Clasificación estricta de mayor a menor en compras acumuladas y análisis Pareto 80/20',
        periodText,
        user
      );

      // Safe KPI extraction
      const kpis = data.kpis || {};
      const totalCost = kpis.totalMpPurchasesCost ?? kpis.total_mp_purchases_cost ?? 0;
      const totalQty = kpis.totalMpQuantity ?? kpis.total_mp_purchases_qty ?? 0;
      const topName = kpis.topSupplierName ?? kpis.top_supplier_name ?? 'N/A';
      const topShare = kpis.topSupplierShare ?? kpis.top_supplier_share_percentage ?? 0;
      const activeCount = kpis.totalActiveSuppliers ?? kpis.active_suppliers_count ?? (data.suppliers?.length || 0);

      // 2. KPIs (Crisp 1-line titles)
      const kpiCards = [
        { title: 'TOTAL COMPRAS MP', value: formatCurrency(totalCost), subtitle: 'Inversión en materia prima', color: '#2563eb' },
        { title: 'VOLUMEN TOTAL MP', value: `${formatNumber(totalQty)} u`, subtitle: 'Kilos y unidades surtidas', color: '#10b981' },
        { title: 'PROVEEDOR PRINCIPAL', value: topName, subtitle: `${topShare}% de participación`, color: '#8b5cf6' },
        { title: 'PROVEEDORES ACTIVOS', value: `${activeCount}`, subtitle: 'Surtieron en el período', color: '#f59e0b' }
      ];
      drawKpiCards(doc, kpiCards, doc.y);

      // 3. Top Suppliers Chart (Horizontal Bars)
      const chartY = doc.y;
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('CLASIFICACIÓN DE COMPRAS A PROVEEDORES (MAYOR A MENOR)', 40, chartY);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Top proveedores clasificados por monto acumulado de compras de MP', 40, chartY + 11);

      const chartBoxY = chartY + 24;
      const chartWidth = doc.page.width - 80;
      const suppliers = data.suppliers || [];
      const topSuppliers = suppliers.slice(0, 6);
      const chartHeight = Math.max(65, (topSuppliers.length * 18) + 16);

      doc.rect(40, chartBoxY, chartWidth, chartHeight).fillAndStroke('#ffffff', '#e2e8f0');

      const maxSpend = topSuppliers.length > 0 ? Math.max(...topSuppliers.map(s => s.totalPurchasesCost ?? s.total_purchases_cost ?? 0)) : 1000;
      const barMaxW = chartWidth - 240;

      topSuppliers.forEach((sup, idx) => {
        const itemY = chartBoxY + 10 + (idx * 18);
        const spend = sup.totalPurchasesCost ?? sup.total_purchases_cost ?? 0;
        const barW = Math.max(4, (spend / (maxSpend || 1)) * barMaxW);
        const name = sup.supplierName || sup.commercialName || sup.business_name || 'Sin Nombre';
        const share = sup.percentageShare ?? sup.share_percentage ?? 0;

        // Rank Badge
        doc.rect(50, itemY, 14, 11).fill('#2563eb');
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold').text(`#${idx + 1}`, 50, itemY + 2, { width: 14, align: 'center' });

        // Supplier Name
        doc.fillColor('#1e293b').fontSize(7).font('Helvetica-Bold').text(name, 70, itemY + 2, { width: 110, ellipsis: true });

        // Bar
        doc.rect(185, itemY + 1, barW, 9).fill('#3b82f6');

        // Value & Share
        const valText = `${formatCurrency(spend)} (${share}%)`;
        doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text(valText, 192 + barW, itemY + 2);
      });

      doc.y = chartBoxY + chartHeight + 14;

      // 4. Data Table: Ranking Completo de Proveedores de MP
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('DISTRIBUCIÓN Y AUDITORÍA DE PROVEEDORES DE MP', 40, doc.y);
      doc.moveDown(0.4);

      const tableTop = doc.y;
      const headers = ['#', 'Razón Social / Proveedor', 'RFC', 'Lotes', 'Volumen MP', 'Compras ($)', '% Part.', 'Pareto'];
      const colWidths = [24, 175, 75, 45, 65, 75, 45, 28];
      const colAligns = ['center', 'left', 'left', 'center', 'right', 'right', 'right', 'center'];

      // Header row
      let curX = 40;
      doc.rect(40, tableTop, chartWidth, 16).fill('#1e293b');
      headers.forEach((h, i) => {
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold').text(h, curX + 2, tableTop + 4.5, { width: colWidths[i] - 4, align: colAligns[i] });
        curX += colWidths[i];
      });

      let rowY = tableTop + 16;
      suppliers.forEach((row, rowIndex) => {
        if (rowY > doc.page.height - 85) {
          doc.addPage();
          drawCorporateHeader(doc, 'REPORTE GERENCIAL: PROVEEDORES DE MATERIA PRIMA (CONT.)', '', periodText, user);
          rowY = doc.y + 10;
        }

        const isAlt = rowIndex % 2 === 1;
        doc.rect(40, rowY, chartWidth, 14).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', '#e2e8f0');

        curX = 40;
        const name = row.supplierName || row.commercialName || row.business_name || 'Sin Razón Social';
        const rfc = row.taxId || row.rfc || 'S/RFC';
        const lots = row.totalLots ?? row.lotes_count ?? 0;
        const qty = row.totalQuantityReceived ?? row.total_purchases_qty ?? 0;
        const spend = row.totalPurchasesCost ?? row.total_purchases_cost ?? 0;
        const share = row.percentageShare ?? row.share_percentage ?? 0;
        const pareto = row.paretoClass || row.pareto_class || (share >= 15 ? 'A' : share >= 5 ? 'B' : 'C');

        const rowCells = [
          `${rowIndex + 1}`,
          name,
          rfc,
          `${lots}`,
          `${formatNumber(qty)} u`,
          formatCurrency(spend),
          `${share}%`,
          pareto
        ];

        rowCells.forEach((cell, i) => {
          const font = i === 1 || i === 5 ? 'Helvetica-Bold' : 'Helvetica';
          const color = i === 7 ? (cell === 'A' ? '#15803d' : '#854d0e') : '#1e293b';
          doc.fillColor(color).fontSize(6).font(font).text(cell, curX + 2, rowY + 3.5, { width: colWidths[i] - 4, align: colAligns[i] });
          curX += colWidths[i];
        });

        rowY += 14;
      });

      // Total row
      doc.rect(40, rowY, chartWidth, 15).fillAndStroke('#f1f5f9', '#cbd5e1');
      curX = 40;
      const totalCells = [
        '',
        `TOTAL (${suppliers.length} Proveedores)`,
        '',
        `${suppliers.reduce((acc, s) => acc + (parseInt(s.totalLots || s.lotes_count || 0, 10)), 0)}`,
        `${formatNumber(totalQty)} u`,
        formatCurrency(totalCost),
        '100.0%',
        ''
      ];
      totalCells.forEach((cell, i) => {
        doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold').text(cell, curX + 2, rowY + 4, { width: colWidths[i] - 4, align: colAligns[i] });
        curX += colWidths[i];
      });

      doc.y = rowY + 20;

      // Signatures
      drawSignaturesBlock(doc, [
        { title: 'Jefatura de Compras y Suministro', name: 'Departamento de Compras', subtitle: 'Adquisiciones MP' },
        { title: 'Recepción y Control de Almacén', name: 'Administrador de Almacén', subtitle: 'ADMIN_ALM' },
        { title: 'Dirección de Finanzas y Operaciones', name: 'Gerencia General', subtitle: 'Autorización Directiva' }
      ]);

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// -----------------------------------------------------------------------------
// 3. GENERATE MERMA, SCRAP Y DEVOLUCIONES REPORT PDF
// -----------------------------------------------------------------------------
async function generateMermaScrapPdf(data, filters, user, res) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true });
      doc.pipe(res);

      const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const monthLabel = (!filters.month || filters.month === 'all') ? 'Todo el Año' : monthNames[parseInt(filters.month, 10)] || filters.month;
      const typeLabel = (!filters.type || filters.type === 'ALL') ? 'Todas las Bajas' : filters.type;
      const periodText = `${filters.year || new Date().getFullYear()} · ${monthLabel} [${typeLabel}]`;

      // 1. Header
      drawCorporateHeader(
        doc,
        'REPORTE DE AUDITORÍA: BAJAS, MERMA, SCRAP Y DEVOLUCIONES',
        'Control estricto de mermas de proceso, scrap, bajas administrativas y devoluciones a proveedor',
        periodText,
        user
      );

      // Safe KPI extraction
      const kpis = data.kpis || {};
      const mermaCost = kpis.totalMermaCost ?? kpis.total_merma_cost ?? 0;
      const mermaQty = kpis.totalMermaQty ?? kpis.total_merma_qty ?? 0;
      const scrapCost = kpis.totalScrapCost ?? kpis.total_scrap_cost ?? 0;
      const scrapQty = kpis.totalScrapQty ?? kpis.total_scrap_qty ?? 0;
      const bajaCost = kpis.totalBajaCost ?? kpis.total_bajas_cost ?? 0;
      const bajaQty = kpis.totalBajaQty ?? kpis.total_bajas_qty ?? 0;
      const devCost = kpis.totalDevolucionCost ?? kpis.total_devoluciones_cost ?? 0;
      const devQty = kpis.totalDevolucionQty ?? kpis.total_devoluciones_qty ?? 0;
      const totalLoss = kpis.totalOperationalLossCost ?? kpis.total_losses_cost ?? (mermaCost + scrapCost + bajaCost);
      const totalLossQty = mermaQty + scrapQty + bajaQty;

      // 2. KPIs (Crisp 1-line titles)
      const kpiCards = [
        { title: 'MERMA EN PROCESO', value: formatCurrency(mermaCost), subtitle: `Cantidad: ${formatNumber(mermaQty)} uds`, color: '#eab308' },
        { title: 'SCRAP GENERADO', value: formatCurrency(scrapCost), subtitle: `Cantidad: ${formatNumber(scrapQty)} uds`, color: '#ef4444', valueColor: '#b91c1c' },
        { title: 'BAJAS DE ALMACÉN', value: formatCurrency(bajaCost), subtitle: `Cantidad: ${formatNumber(bajaQty)} uds`, color: '#8b5cf6' },
        { title: 'DEVOLUCIONES', value: formatCurrency(devCost), subtitle: `Devuelto: ${formatNumber(devQty)} uds`, color: '#2563eb' },
        { title: 'TOTAL PÉRDIDAS', value: formatCurrency(totalLoss), subtitle: `Pérdida: ${formatNumber(totalLossQty)} uds`, color: '#dc2626', valueColor: '#991b1b' }
      ];
      drawKpiCards(doc, kpiCards, doc.y);

      // 3. Loss & Devolucion Breakdown by Material Table
      const chartWidth = doc.page.width - 80;
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('RESUMEN DE IMPACTO POR MATERIAL', 40, doc.y);
      doc.moveDown(0.4);

      const tableTop = doc.y;
      const headers = ['Código', 'Material', 'Tipo Movimiento', 'Cant. Afectada', 'Costo Unit. Prom.', 'Total Costo ($)'];
      const colWidths = [70, 180, 85, 65, 65, 67];
      const colAligns = ['left', 'left', 'left', 'right', 'right', 'right'];

      let curX = 40;
      doc.rect(40, tableTop, chartWidth, 16).fill('#1e293b');
      headers.forEach((h, i) => {
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold').text(h, curX + 2, tableTop + 4.5, { width: colWidths[i] - 4, align: colAligns[i] });
        curX += colWidths[i];
      });

      let rowY = tableTop + 16;
      const materials = data.materials || data.materialSummary || [];
      materials.forEach((mat, rowIndex) => {
        if (rowY > doc.page.height - 85) {
          doc.addPage();
          drawCorporateHeader(doc, 'REPORTE DE AUDITORÍA: BAJAS, MERMA Y SCRAP (CONT.)', '', periodText, user);
          rowY = doc.y + 10;
        }

        const isAlt = rowIndex % 2 === 1;
        doc.rect(40, rowY, chartWidth, 13).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', '#e2e8f0');

        curX = 40;
        const code = mat.internalCode || mat.internal_code || mat.material_code || 'S/C';
        const name = mat.materialName || mat.material_name || 'Sin Nombre';
        const type = mat.movementType || mat.movement_type || (mat.devolucionCost > 0 ? 'DEVOLUCION' : mat.mermaCost > 0 ? 'MERMA' : mat.scrapCost > 0 ? 'SCRAP' : 'BAJA');
        const qty = mat.totalQty ?? mat.quantity ?? 0;
        const unitCost = mat.unitCost ?? mat.unit_cost ?? (qty > 0 ? (mat.totalCost ?? mat.total_loss ?? 0) / qty : 0);
        const total = mat.totalCost ?? mat.total_loss ?? 0;

        const rowCells = [
          code,
          name,
          type,
          `${formatNumber(qty)} u`,
          formatCurrency(unitCost),
          formatCurrency(total)
        ];

        rowCells.forEach((cell, i) => {
          const font = i === 1 || i === 5 ? 'Helvetica-Bold' : 'Helvetica';
          const color = type === 'DEVOLUCION' ? '#2563eb' : i === 5 ? '#b91c1c' : '#1e293b';
          doc.fillColor(color).fontSize(6).font(font).text(cell, curX + 2, rowY + 3.5, { width: colWidths[i] - 4, align: colAligns[i] });
          curX += colWidths[i];
        });

        rowY += 13;
      });

      doc.y = rowY + 14;

      // 4. Detailed Audit Log Table
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('REGISTRO AUDITADO DE LOTES Y MOVIMIENTOS', 40, doc.y);
      doc.moveDown(0.4);

      const auditTop = doc.y;
      const auditHeaders = ['Fecha', 'Folio / Lote', 'Material', 'Tipo / Motivo', 'Cantidad', 'Costo Valorizado', 'Responsable'];
      const auditWidths = [65, 80, 140, 75, 55, 65, 52];
      const auditAligns = ['left', 'left', 'left', 'left', 'right', 'right', 'left'];

      curX = 40;
      doc.rect(40, auditTop, chartWidth, 16).fill('#1e293b');
      auditHeaders.forEach((h, i) => {
        doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold').text(h, curX + 2, auditTop + 4.5, { width: auditWidths[i] - 4, align: auditAligns[i] });
        curX += auditWidths[i];
      });

      let aRowY = auditTop + 16;
      const movements = data.movements || [];
      movements.slice(0, 50).forEach((mov, rIdx) => {
        if (aRowY > doc.page.height - 85) {
          doc.addPage();
          drawCorporateHeader(doc, 'REPORTE DE AUDITORÍA: REGISTRO DE MOVIMIENTOS (CONT.)', '', periodText, user);
          aRowY = doc.y + 10;
        }

        const isAlt = rIdx % 2 === 1;
        doc.rect(40, aRowY, chartWidth, 13).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', '#e2e8f0');

        curX = 40;
        const dateRaw = mov.createdAt || mov.created_at;
        const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('es-MX') : 'N/A';
        const folio = mov.lote?.folio || mov.internalCode || mov.internal_code || mov.lote?.uuid?.substring(0, 10) || `MOV-${mov.id}`;
        const matName = mov.materialName || mov.material?.name || 'Material';
        const type = mov.type || mov.movement_type || 'BAJA';
        const qty = mov.quantity || 0;
        const cost = mov.totalCost ?? mov.total_cost ?? 0;
        const resp = mov.performedBy || mov.user?.username || 'Sistema';

        const aCells = [
          dateStr,
          folio,
          matName,
          type,
          `${formatNumber(qty)}`,
          formatCurrency(cost),
          resp
        ];

        aCells.forEach((cell, i) => {
          const font = i === 1 || i === 5 ? 'Helvetica-Bold' : 'Helvetica';
          const color = type === 'DEVOLUCION' ? '#2563eb' : i === 5 ? '#b91c1c' : '#334155';
          doc.fillColor(color).fontSize(6).font(font).text(cell, curX + 2, aRowY + 3.5, { width: auditWidths[i] - 4, align: auditAligns[i] });
          curX += auditWidths[i];
        });

        aRowY += 13;
      });

      doc.y = aRowY + 20;

      // 5. Signatures
      drawSignaturesBlock(doc, [
        { title: 'Supervisor de Calidad / Planta', name: 'Control de Merma y Calidad', subtitle: 'Inspección Técnica' },
        { title: 'Administrador de Almacén', name: 'Jefatura de Almacén', subtitle: 'ADMIN_ALM' },
        { title: 'Gerencia de Operaciones', name: 'Dirección General', subtitle: 'Autorización Ejecutiva' }
      ]);

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateMonthlyReportPdf,
  generateSuppliersReportPdf,
  generateMermaScrapPdf
};
