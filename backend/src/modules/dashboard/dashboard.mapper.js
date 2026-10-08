/**
 * Transformador de DAOs (Sequelize) a DTOs de Dashboard (Operations Control Center)
 * Cumple la Regla de Oro #6: Prepara el estado, no inyecta lógica falsa.
 */

const getSeverityForYield = (yieldValue) => {
  if (yieldValue == null) return 'DEFAULT';
  if (yieldValue >= 95) return 'GOOD';
  if (yieldValue >= 90) return 'WARNING';
  return 'CRITICAL';
};

const getSeverityForScrap = (scrapRatio) => {
  if (scrapRatio == null) return 'DEFAULT';
  if (scrapRatio <= 3) return 'GOOD';
  if (scrapRatio <= 6) return 'WARNING';
  return 'CRITICAL';
};

class DashboardMapper {
  static toPayload(raw) {
    const now = new Date().toISOString();
    const { productionTotal, totalInput, scrapTotal, activeRuns, lowStockAlerts } = raw;

    // --- Cálculos de Regla Base ---
    const yieldValue = totalInput > 0 ? ((productionTotal / totalInput) * 100).toFixed(1) : null;
    const scrapRatio = totalInput > 0 ? ((scrapTotal / totalInput) * 100).toFixed(1) : null;

    // Cálculo para OEE según lo que hacía el Frontend
    const scrapRatioForOee = scrapTotal > 0 ? (scrapTotal / ((productionTotal || 0) + scrapTotal)) * 100 : 0;
    const calidadReal = 100 - scrapRatioForOee;
    const disponibilidadReal = 0; // Hardcoded en frontend por ahora
    const yieldNumeric = Number(yieldValue) || 0;
    const oeeReal = ((calidadReal / 100) * (yieldNumeric / 100) * (disponibilidadReal / 100)) * 100 || 0;

    return {
      generated_at: now,
      last_update: now,
      kpis: {
        production: {
          label: 'Producción Actual',
          value: productionTotal || 0,
          unit: 'kg',
          status: productionTotal > 0 ? 'GOOD' : 'DEFAULT',
        },
        scrap: {
          label: 'Scrap Generado',
          value: scrapTotal || 0,
          unit: 'kg',
          status: getSeverityForScrap(scrapRatio),
        },
        yield: {
          label: 'Yield',
          value: yieldValue || '---',
          unit: yieldValue ? '%' : '',
          status: getSeverityForYield(yieldValue),
        },
        // KPIs calculados en el backend para evitar violaciones de frontend
        calidad: {
          label: 'Calidad',
          value: calidadReal,
          unit: '%',
          status: getSeverityForYield(calidadReal),
        },
        disponibilidad: {
          label: 'Disponibilidad',
          value: disponibilidadReal,
          unit: '%',
          status: 'DEFAULT',
        },
        oee: {
          label: 'OEE',
          value: oeeReal,
          unit: '%',
          status: 'DEFAULT',
        },
      },
      active_runs: activeRuns.map(run => ({
        id: run.id,
        code: run.code,
        process_name: run.formula ? run.formula.code : 'Desconocido', // o dependemos de la relacion si existe
        status: run.status,
        production_current: `${run.total_output || 0} kg`,
        alerts: 0 // Si tuvieramos tabla de eventos vinculados, se mapearían aquí
      })),
      charts: {
        yieldData: raw.yieldData,
        scrapData: raw.scrapData
      },
      alerts: [
        ...lowStockAlerts.map(material => ({
          id: `stk-${material.id}`,
          severity: 'CRITICAL',
          message: `Material bajo mínimo: ${material.code} (${material.stock_actual} ${material.unit_measure})`,
          timestamp: now,
        }))
      ]
    };
  }
}

module.exports = DashboardMapper;
