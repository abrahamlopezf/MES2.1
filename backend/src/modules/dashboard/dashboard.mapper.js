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
        // OEE no tiene fuente oficial, mandamos UNAVAILABLE por diseño estricto
        oee: {
          label: 'OEE',
          value: '---',
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
