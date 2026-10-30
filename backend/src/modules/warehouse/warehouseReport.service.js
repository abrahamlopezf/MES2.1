const { sequelize, Lote, Supplier, Material, Ranking, InventoryMovement, Inventory, MaterialUnit, User } = require('../../database/models');
const { Op } = require('sequelize');

/**
 * Servicio de Reportes Ejecutivos de Almacén
 */
class WarehouseReportService {

  /**
   * 1. Reporte Mensual Ejecutivo de Movimientos, Entradas, Consumos y Bajas
   */
  async getMonthlyReport(query = {}) {
    const currentYear = new Date().getFullYear();
    const year = parseInt(query.year, 10) || currentYear;
    const month = query.month && query.month !== 'all' ? parseInt(query.month, 10) : null;
    const { startDate, endDate } = query;

    // Construir filtro de fecha
    let dateFilterSqlLotes = `EXTRACT(YEAR FROM l.date_received) = ${year}`;
    let dateFilterSqlMovements = `EXTRACT(YEAR FROM im.created_at) = ${year}`;

    if (startDate && endDate) {
      dateFilterSqlLotes = `l.date_received BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
      dateFilterSqlMovements = `im.created_at BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    } else if (month) {
      dateFilterSqlLotes += ` AND EXTRACT(MONTH FROM l.date_received) = ${month}`;
      dateFilterSqlMovements += ` AND EXTRACT(MONTH FROM im.created_at) = ${month}`;
    }

    // A) Tendencias Mensuales (Ene - Dic)
    const [entriesTrend] = await sequelize.query(`
      SELECT 
        EXTRACT(MONTH FROM l.date_received)::int as m,
        COUNT(l.id) as count,
        COALESCE(SUM(l.initial_amount), 0) as total_qty,
        COALESCE(SUM(l.initial_amount * COALESCE(l.unit_cost, 0)), 0) as total_cost
      FROM lotes l
      WHERE EXTRACT(YEAR FROM l.date_received) = ${year}
      GROUP BY EXTRACT(MONTH FROM l.date_received)
      ORDER BY m ASC
    `);

    const [consumptionsTrend] = await sequelize.query(`
      SELECT 
        EXTRACT(MONTH FROM im.created_at)::int as m,
        COUNT(im.id) as count,
        COALESCE(SUM(ABS(im.quantity_change)), 0) as total_qty,
        COALESCE(SUM(COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0))), 0) as total_cost
      FROM inventory_movements im
      WHERE im.type = 'CONSUMPTION' AND EXTRACT(YEAR FROM im.created_at) = ${year}
      GROUP BY EXTRACT(MONTH FROM im.created_at)
      ORDER BY m ASC
    `);

    const [bajasTrend] = await sequelize.query(`
      SELECT 
        EXTRACT(MONTH FROM im.created_at)::int as m,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN ABS(im.quantity_change) ELSE 0 END), 0) as merma_qty,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as merma_cost,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN ABS(im.quantity_change) ELSE 0 END), 0) as scrap_qty,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as scrap_cost,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN ABS(im.quantity_change) ELSE 0 END), 0) as baja_qty,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as baja_cost,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN ABS(im.quantity_change) ELSE 0 END), 0) as devolucion_qty,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as devolucion_cost
      FROM inventory_movements im
      WHERE im.type IN ('MERMA', 'SCRAP', 'BAJA', 'DISPOSE', 'DEVOLUCION') AND EXTRACT(YEAR FROM im.created_at) = ${year}
      GROUP BY EXTRACT(MONTH FROM im.created_at)
      ORDER BY m ASC
    `);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyTrends = [];

    for (let i = 1; i <= 12; i++) {
      const e = entriesTrend.find(row => parseInt(row.m, 10) === i) || {};
      const c = consumptionsTrend.find(row => parseInt(row.m, 10) === i) || {};
      const b = bajasTrend.find(row => parseInt(row.m, 10) === i) || {};

      const entriesCost = parseFloat(e.total_cost || 0);
      const entriesQty = parseFloat(e.total_qty || 0);
      const consumptionsCost = parseFloat(c.total_cost || 0);
      const consumptionsQty = parseFloat(c.total_qty || 0);
      const mermaCost = parseFloat(b.merma_cost || 0);
      const scrapCost = parseFloat(b.scrap_cost || 0);
      const bajaCost = parseFloat(b.baja_cost || 0);
      const devolucionCost = parseFloat(b.devolucion_cost || 0);
      const wasteCost = mermaCost + scrapCost + bajaCost;
      const wasteQty = parseFloat(b.merma_qty || 0) + parseFloat(b.scrap_qty || 0) + parseFloat(b.baja_qty || 0);
      const devolucionQty = parseFloat(b.devolucion_qty || 0);

      monthlyTrends.push({
        monthNumber: i,
        monthName: monthNames[i - 1],
        entriesCost,
        entriesQty,
        consumptionsCost,
        consumptionsQty,
        wasteCost,
        wasteQty,
        devolucionCost,
        devolucionQty,
        netBalanceCost: entriesCost - consumptionsCost - wasteCost - devolucionCost,
        netBalanceQty: entriesQty - consumptionsQty - wasteQty - devolucionQty
      });
    }

    // B) Totales para el período seleccionado
    const [periodEntries] = await sequelize.query(`
      SELECT 
        COUNT(l.id) as total_lots,
        COALESCE(SUM(l.initial_amount), 0) as total_qty,
        COALESCE(SUM(l.initial_amount * COALESCE(l.unit_cost, 0)), 0) as total_cost
      FROM lotes l
      WHERE ${dateFilterSqlLotes}
    `);

    const [periodConsumptions] = await sequelize.query(`
      SELECT 
        COUNT(im.id) as total_movements,
        COALESCE(SUM(ABS(im.quantity_change)), 0) as total_qty,
        COALESCE(SUM(COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0))), 0) as total_cost
      FROM inventory_movements im
      WHERE im.type = 'CONSUMPTION' AND ${dateFilterSqlMovements}
    `);

    const [periodBajas] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN ABS(im.quantity_change) ELSE 0 END), 0) as merma_qty,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as merma_cost,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN ABS(im.quantity_change) ELSE 0 END), 0) as scrap_qty,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as scrap_cost,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN ABS(im.quantity_change) ELSE 0 END), 0) as baja_qty,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as baja_cost,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN ABS(im.quantity_change) ELSE 0 END), 0) as devolucion_qty,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as devolucion_cost
      FROM inventory_movements im
      WHERE im.type IN ('MERMA', 'SCRAP', 'BAJA', 'DISPOSE', 'DEVOLUCION') AND ${dateFilterSqlMovements}
    `);

    const totalIncomeCost = parseFloat(periodEntries[0]?.total_cost || 0);
    const totalIncomeQty = parseFloat(periodEntries[0]?.total_qty || 0);
    const totalConsumptionCost = parseFloat(periodConsumptions[0]?.total_cost || 0);
    const totalConsumptionQty = parseFloat(periodConsumptions[0]?.total_qty || 0);

    const mermaCost = parseFloat(periodBajas[0]?.merma_cost || 0);
    const mermaQty = parseFloat(periodBajas[0]?.merma_qty || 0);
    const scrapCost = parseFloat(periodBajas[0]?.scrap_cost || 0);
    const scrapQty = parseFloat(periodBajas[0]?.scrap_qty || 0);
    const bajaCost = parseFloat(periodBajas[0]?.baja_cost || 0);
    const bajaQty = parseFloat(periodBajas[0]?.baja_qty || 0);
    const devolucionCost = parseFloat(periodBajas[0]?.devolucion_cost || 0);
    const devolucionQty = parseFloat(periodBajas[0]?.devolucion_qty || 0);

    const totalWasteCost = mermaCost + scrapCost + bajaCost;
    const totalWasteQty = mermaQty + scrapQty + bajaQty;
    const netBalanceCost = totalIncomeCost - totalConsumptionCost - totalWasteCost - devolucionCost;
    const netBalanceQty = totalIncomeQty - totalConsumptionQty - totalWasteQty - devolucionQty;
    const turnoverRatePct = totalIncomeCost > 0 ? (totalConsumptionCost / totalIncomeCost) * 100 : 0;

    // C) Distribución por Categoría / Ranking de Material
    const [rankingDistribution] = await sequelize.query(`
      SELECT 
        COALESCE(r.name, 'Sin Clasificar') as ranking_name,
        COALESCE(r.nomenclature, 'S/C') as nomenclature,
        COUNT(DISTINCT m.id) as materials_count,
        COALESCE(SUM(l.initial_amount * COALESCE(l.unit_cost, 0)), 0) as total_purchases_cost,
        COALESCE(SUM(l.initial_amount), 0) as total_qty
      FROM lotes l
      JOIN materials m ON l.material_id = m.id
      LEFT JOIN rankings r ON m.ranking_id = r.id
      WHERE ${dateFilterSqlLotes}
      GROUP BY r.name, r.nomenclature
      ORDER BY total_purchases_cost DESC
    `);

    // D) Transacciones Recientes del Período (para visualización y exportación ejecutiva)
    const [recentMovements] = await sequelize.query(`
      SELECT 
        im.id,
        im.type,
        im.quantity_change,
        im.unit_cost,
        COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) as total_cost,
        im.notes,
        im.created_at,
        s.code as silo_code,
        prep.folio as preparation_folio,
        m.name as material_name,
        m.internal_code,
        u.first_name,
        u.last_name
      FROM inventory_movements im
      JOIN inventories inv ON im.inventory_id = inv.id
      JOIN materials m ON inv.material_id = m.id
      LEFT JOIN silos s ON im.silo_id = s.id
      LEFT JOIN process_preparations prep ON im.process_preparation_id = prep.id
      LEFT JOIN users u ON im.performed_by = u.id
      WHERE ${dateFilterSqlMovements}
      ORDER BY im.created_at DESC
      LIMIT 100
    `);

    return {
      period: {
        year,
        month,
        startDate: startDate || null,
        endDate: endDate || null
      },
      kpis: {
        totalIncomeCost,
        totalIncomeQty,
        totalConsumptionCost,
        totalConsumptionQty,
        mermaCost,
        mermaQty,
        scrapCost,
        scrapQty,
        bajaCost,
        bajaQty,
        totalWasteCost,
        totalWasteQty,
        devolucionCost,
        devolucionQty,
        netBalanceCost,
        netBalanceQty,
        turnoverRatePct: parseFloat(turnoverRatePct.toFixed(1))
      },
      monthlyTrends,
      rankingDistribution: rankingDistribution.map(r => ({
        rankingName: r.ranking_name,
        nomenclature: r.nomenclature,
        materialsCount: parseInt(r.materials_count, 10),
        totalPurchasesCost: parseFloat(r.total_purchases_cost),
        totalQty: parseFloat(r.total_qty)
      })),
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        type: m.type,
        quantity: parseFloat(m.quantity_change),
        unitCost: parseFloat(m.unit_cost || 0),
        totalCost: parseFloat(m.total_cost || 0),
        notes: m.notes,
        createdAt: m.created_at,
        materialName: m.material_name,
        internalCode: m.internal_code,
        siloCode: m.silo_code || null,
        preparationFolio: m.preparation_folio || null,
        performedBy: m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : 'Sistema'
      }))
    };
  }

  /**
   * 2. Reporte de Proveedores de Materia Prima (MP) Clasificados de Mayor a Menor
   */
  async getSuppliersReport(query = {}) {
    const currentYear = new Date().getFullYear();
    const year = parseInt(query.year, 10) || currentYear;
    const month = query.month && query.month !== 'all' ? parseInt(query.month, 10) : null;
    const { startDate, endDate, sortBy = 'cost' } = query;

    let dateFilterSql = `EXTRACT(YEAR FROM l.date_received) = ${year}`;
    if (startDate && endDate) {
      dateFilterSql = `l.date_received BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    } else if (month) {
      dateFilterSql += ` AND EXTRACT(MONTH FROM l.date_received) = ${month}`;
    }

    // Filtro estricto para proveedores de Materia Prima (MP)
    const mpCondition = `(
      r.nomenclature ILIKE '%MP%' 
      OR r.name ILIKE '%materia prima%' 
      OR m.ranking_id = 1 
      OR m.internal_code ILIKE 'MP-%'
    )`;

    // Consulta de proveedores ordenados de mayor a menor en compras/ingresos
    const [suppliersRows] = await sequelize.query(`
      SELECT 
        s.id as supplier_id,
        s.code as supplier_code,
        s.name as supplier_name,
        s.commercial_name,
        s.tax_id,
        s.phone,
        s.email,
        COUNT(l.id) as total_lots,
        COALESCE(SUM(l.initial_amount), 0) as total_quantity_received,
        COALESCE(SUM(l.initial_amount * COALESCE(l.unit_cost, 0)), 0) as total_purchases_cost,
        MAX(l.date_received) as last_delivery_date,
        MIN(l.date_received) as first_delivery_date,
        STRING_AGG(DISTINCT m.name, ', ') as materials_supplied,
        STRING_AGG(DISTINCT m.internal_code, ', ') as materials_codes
      FROM lotes l
      JOIN suppliers s ON l.supplier_id = s.id
      JOIN materials m ON l.material_id = m.id
      LEFT JOIN rankings r ON m.ranking_id = r.id
      WHERE ${mpCondition} AND ${dateFilterSql}
      GROUP BY s.id, s.code, s.name, s.commercial_name, s.tax_id, s.phone, s.email
      ORDER BY ${sortBy === 'quantity' ? 'total_quantity_received' : 'total_purchases_cost'} DESC
    `);

    // Calcular totales para proporciones y análisis Pareto
    const totalMpPurchasesCost = suppliersRows.reduce((acc, row) => acc + parseFloat(row.total_purchases_cost || 0), 0);
    const totalMpQuantity = suppliersRows.reduce((acc, row) => acc + parseFloat(row.total_quantity_received || 0), 0);
    const totalLotsCount = suppliersRows.reduce((acc, row) => acc + parseInt(row.total_lots || 0, 10), 0);

    let runningCostTotal = 0;
    const rankedSuppliers = suppliersRows.map((s, index) => {
      const cost = parseFloat(s.total_purchases_cost || 0);
      const qty = parseFloat(s.total_quantity_received || 0);
      const percentageShare = totalMpPurchasesCost > 0 ? (cost / totalMpPurchasesCost) * 100 : 0;
      runningCostTotal += cost;
      const cumulativeShare = totalMpPurchasesCost > 0 ? (runningCostTotal / totalMpPurchasesCost) * 100 : 0;

      return {
        rank: index + 1,
        supplierId: s.supplier_id,
        supplierCode: s.supplier_code,
        supplierName: s.supplier_name,
        commercialName: s.commercial_name,
        taxId: s.tax_id,
        phone: s.phone,
        email: s.email,
        totalLots: parseInt(s.total_lots, 10),
        totalPurchasesCost: cost,
        totalQuantityReceived: qty,
        percentageShare: parseFloat(percentageShare.toFixed(1)),
        cumulativeShare: parseFloat(cumulativeShare.toFixed(1)),
        lastDeliveryDate: s.last_delivery_date,
        firstDeliveryDate: s.first_delivery_date,
        materialsSupplied: s.materials_supplied ? s.materials_supplied.split(', ') : [],
        materialsCodes: s.materials_codes ? s.materials_codes.split(', ') : []
      };
    });

    // Tendencias mensuales para los top 5 proveedores de MP
    const topSupplierIds = rankedSuppliers.slice(0, 5).map(s => s.supplierId);
    let topSuppliersTrend = [];

    if (topSupplierIds.length > 0) {
      const [trendRows] = await sequelize.query(`
        SELECT 
          l.supplier_id,
          s.name as supplier_name,
          EXTRACT(MONTH FROM l.date_received)::int as m,
          COALESCE(SUM(l.initial_amount * COALESCE(l.unit_cost, 0)), 0) as monthly_cost,
          COALESCE(SUM(l.initial_amount), 0) as monthly_qty
        FROM lotes l
        JOIN suppliers s ON l.supplier_id = s.id
        JOIN materials m ON l.material_id = m.id
        LEFT JOIN rankings r ON m.ranking_id = r.id
        WHERE ${mpCondition} 
          AND l.supplier_id IN (${topSupplierIds.join(',')})
          AND EXTRACT(YEAR FROM l.date_received) = ${year}
        GROUP BY l.supplier_id, s.name, EXTRACT(MONTH FROM l.date_received)
        ORDER BY m ASC
      `);

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let m = 1; m <= 12; m++) {
        const monthEntry = { monthNumber: m, monthName: monthNames[m - 1] };
        topSupplierIds.forEach(id => {
          const sup = rankedSuppliers.find(r => r.supplierId === id);
          const found = trendRows.find(tr => tr.supplier_id === id && parseInt(tr.m, 10) === m);
          monthEntry[sup ? sup.supplierName : `Prov_${id}`] = found ? parseFloat(found.monthly_cost) : 0;
        });
        topSuppliersTrend.push(monthEntry);
      }
    }

    return {
      period: {
        year,
        month,
        startDate: startDate || null,
        endDate: endDate || null
      },
      kpis: {
        totalMpPurchasesCost,
        totalMpQuantity,
        totalActiveSuppliers: rankedSuppliers.length,
        totalLotsReceived: totalLotsCount,
        topSupplierName: rankedSuppliers[0]?.supplierName || 'N/A',
        topSupplierShare: rankedSuppliers[0]?.percentageShare || 0,
        averageSpendPerSupplier: rankedSuppliers.length > 0 ? parseFloat((totalMpPurchasesCost / rankedSuppliers.length).toFixed(2)) : 0
      },
      suppliers: rankedSuppliers,
      topSuppliersTrend
    };
  }

  /**
   * 3. Reporte de Bajas, Mermas, Scrap y Devoluciones con Tendencias
   */
  async getMermaScrapDevolucionesReport(query = {}) {
    const currentYear = new Date().getFullYear();
    const year = parseInt(query.year, 10) || currentYear;
    const month = query.month && query.month !== 'all' ? parseInt(query.month, 10) : null;
    const { startDate, endDate, type, material_id } = query;

    let whereClause = `im.type IN ('MERMA', 'SCRAP', 'DISPOSE', 'BAJA', 'DEVOLUCION')`;

    if (startDate && endDate) {
      whereClause += ` AND im.created_at BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    } else if (month) {
      whereClause += ` AND EXTRACT(YEAR FROM im.created_at) = ${year} AND EXTRACT(MONTH FROM im.created_at) = ${month}`;
    } else if (year) {
      whereClause += ` AND EXTRACT(YEAR FROM im.created_at) = ${year}`;
    }

    if (type && type !== 'ALL') {
      if (type === 'BAJA') {
        whereClause += ` AND im.type IN ('BAJA', 'DISPOSE')`;
      } else {
        whereClause += ` AND im.type = '${type}'`;
      }
    }

    if (material_id) {
      whereClause += ` AND inv.material_id = ${parseInt(material_id, 10)}`;
    }

    // A) Resumen agrupado por Material
    const [materialsSummary] = await sequelize.query(`
      SELECT 
        inv.material_id,
        m.internal_code,
        m.name as material_name,
        m.description as material_description,
        mu.code as unit_code,
        r.nomenclature as ranking_code,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN ABS(im.quantity_change) ELSE 0 END), 0) as merma_qty,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as merma_cost,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN ABS(im.quantity_change) ELSE 0 END), 0) as scrap_qty,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as scrap_cost,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN ABS(im.quantity_change) ELSE 0 END), 0) as baja_qty,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as baja_cost,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN ABS(im.quantity_change) ELSE 0 END), 0) as devolucion_qty,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as devolucion_cost,
        COALESCE(SUM(ABS(im.quantity_change)), 0) as total_qty,
        COALESCE(SUM(COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0))), 0) as total_cost
      FROM inventory_movements im
      JOIN inventories inv ON im.inventory_id = inv.id
      JOIN materials m ON inv.material_id = m.id
      LEFT JOIN material_units mu ON m.base_unit_id = mu.id
      LEFT JOIN rankings r ON m.ranking_id = r.id
      WHERE ${whereClause}
      GROUP BY inv.material_id, m.internal_code, m.name, m.description, mu.code, r.nomenclature
      ORDER BY total_cost DESC
    `);

    // B) Tendencia Temporal (por mes del año)
    const [trendRows] = await sequelize.query(`
      SELECT 
        EXTRACT(MONTH FROM im.created_at)::int as m,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as merma_cost,
        COALESCE(SUM(CASE WHEN im.type = 'MERMA' THEN ABS(im.quantity_change) ELSE 0 END), 0) as merma_qty,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as scrap_cost,
        COALESCE(SUM(CASE WHEN im.type = 'SCRAP' THEN ABS(im.quantity_change) ELSE 0 END), 0) as scrap_qty,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as baja_cost,
        COALESCE(SUM(CASE WHEN im.type IN ('BAJA', 'DISPOSE') THEN ABS(im.quantity_change) ELSE 0 END), 0) as baja_qty,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) ELSE 0 END), 0) as devolucion_cost,
        COALESCE(SUM(CASE WHEN im.type = 'DEVOLUCION' THEN ABS(im.quantity_change) ELSE 0 END), 0) as devolucion_qty
      FROM inventory_movements im
      JOIN inventories inv ON im.inventory_id = inv.id
      WHERE im.type IN ('MERMA', 'SCRAP', 'DISPOSE', 'BAJA', 'DEVOLUCION')
        AND EXTRACT(YEAR FROM im.created_at) = ${year}
      GROUP BY EXTRACT(MONTH FROM im.created_at)
      ORDER BY m ASC
    `);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const trends = [];
    for (let i = 1; i <= 12; i++) {
      const found = trendRows.find(r => parseInt(r.m, 10) === i) || {};
      trends.push({
        monthNumber: i,
        monthName: monthNames[i - 1],
        mermaCost: parseFloat(found.merma_cost || 0),
        mermaQty: parseFloat(found.merma_qty || 0),
        scrapCost: parseFloat(found.scrap_cost || 0),
        scrapQty: parseFloat(found.scrap_qty || 0),
        bajaCost: parseFloat(found.baja_cost || 0),
        bajaQty: parseFloat(found.baja_qty || 0),
        devolucionCost: parseFloat(found.devolucion_cost || 0),
        devolucionQty: parseFloat(found.devolucion_qty || 0),
        totalCost: parseFloat(found.merma_cost || 0) + parseFloat(found.scrap_cost || 0) + parseFloat(found.baja_cost || 0) + parseFloat(found.devolucion_cost || 0)
      });
    }

    // C) Desglose de Transacciones Detalladas
    const [movementsList] = await sequelize.query(`
      SELECT 
        im.id,
        im.type,
        ABS(im.quantity_change) as quantity,
        im.unit_cost,
        COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0)) as total_cost,
        im.notes,
        im.created_at,
        m.id as material_id,
        m.name as material_name,
        m.internal_code,
        m.description as material_description,
        mu.code as unit_code,
        u.first_name,
        u.last_name
      FROM inventory_movements im
      JOIN inventories inv ON im.inventory_id = inv.id
      JOIN materials m ON inv.material_id = m.id
      LEFT JOIN material_units mu ON m.base_unit_id = mu.id
      LEFT JOIN users u ON im.performed_by = u.id
      WHERE ${whereClause}
      ORDER BY im.created_at DESC
      LIMIT 200
    `);

    // Totales Generales
    let totalMermaCost = 0;
    let totalMermaQty = 0;
    let totalScrapCost = 0;
    let totalScrapQty = 0;
    let totalBajaCost = 0;
    let totalBajaQty = 0;
    let totalDevolucionCost = 0;
    let totalDevolucionQty = 0;

    materialsSummary.forEach(m => {
      totalMermaCost += parseFloat(m.merma_cost || 0);
      totalMermaQty += parseFloat(m.merma_qty || 0);
      totalScrapCost += parseFloat(m.scrap_cost || 0);
      totalScrapQty += parseFloat(m.scrap_qty || 0);
      totalBajaCost += parseFloat(m.baja_cost || 0);
      totalBajaQty += parseFloat(m.baja_qty || 0);
      totalDevolucionCost += parseFloat(m.devolucion_cost || 0);
      totalDevolucionQty += parseFloat(m.devolucion_qty || 0);
    });

    const totalOperationalLossCost = totalMermaCost + totalScrapCost + totalBajaCost;
    const totalOutflowCost = totalOperationalLossCost + totalDevolucionCost;

    return {
      period: {
        year,
        month,
        startDate: startDate || null,
        endDate: endDate || null
      },
      kpis: {
        totalMermaCost,
        totalMermaQty,
        totalScrapCost,
        totalScrapQty,
        totalBajaCost,
        totalBajaQty,
        totalDevolucionCost,
        totalDevolucionQty,
        totalOperationalLossCost,
        totalOutflowCost
      },
      trends,
      materials: materialsSummary.map(m => ({
        materialId: m.material_id,
        internalCode: m.internal_code,
        materialName: m.material_name,
        materialDescription: m.material_description,
        unitCode: m.unit_code || 'UDS',
        rankingCode: m.ranking_code || 'S/C',
        mermaQty: parseFloat(m.merma_qty),
        mermaCost: parseFloat(m.merma_cost),
        scrapQty: parseFloat(m.scrap_qty),
        scrapCost: parseFloat(m.scrap_cost),
        bajaQty: parseFloat(m.baja_qty),
        bajaCost: parseFloat(m.baja_cost),
        devolucionQty: parseFloat(m.devolucion_qty),
        devolucionCost: parseFloat(m.devolucion_cost),
        totalQty: parseFloat(m.total_qty),
        totalCost: parseFloat(m.total_cost)
      })),
      movements: movementsList.map(m => ({
        id: m.id,
        type: m.type,
        quantity: parseFloat(m.quantity),
        unitCode: m.unit_code || 'UDS',
        unitCost: parseFloat(m.unit_cost || 0),
        totalCost: parseFloat(m.total_cost || 0),
        notes: m.notes,
        createdAt: m.created_at,
        materialId: m.material_id,
        materialName: m.material_name,
        internalCode: m.internal_code,
        materialDescription: m.material_description,
        performedBy: m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : 'Sistema'
      }))
    };
  }
}

module.exports = new WarehouseReportService();
