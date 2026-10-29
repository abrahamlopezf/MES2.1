'use strict';

const CACHE_MS = 24 * 60 * 60 * 1000;
const DOF_HOSTS = ['www.dof.gob.mx', 'dof.gob.mx'];
const cache = new Map();

const localDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const parseIsoDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw Object.assign(new Error('La fecha de factura debe tener formato AAAA-MM-DD.'), { statusCode: 400 });
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error('La fecha de factura no es válida.'), { statusCode: 400 });
  }
  return date;
};

const toDofDate = (date) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
const toIsoDate = (dmy) => {
  const [, day, month, year] = dmy.match(/^(\d{2})-(\d{2})-(\d{4})$/) || [];
  return year ? `${year}-${month}-${day}` : null;
};

const parseDofRates = (html) => {
  const rates = [];
  const rows = String(html).match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
    const match = text.match(/(\d{2}-\d{2}-\d{4})\s+([0-9]+(?:[.,][0-9]+)?)/);
    if (!match) continue;
    const date = toIsoDate(match[1]);
    const rate = Number(match[2].replace(',', '.'));
    if (date && Number.isFinite(rate) && rate > 0) rates.push({ date, rate });
  }
  return rates;
};

const getUsdMxnRate = async (requestedDate = localDate()) => {
  const targetDate = parseIsoDate(requestedDate).toISOString().slice(0, 10);
  if (targetDate > localDate()) {
    throw Object.assign(new Error('La fecha de factura no puede estar en el futuro.'), { statusCode: 400 });
  }
  const cached = cache.get(targetDate);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) return cached.value;

  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const start = new Date(target);
  // Abarca cierres prolongados y días inhábiles; se usa la publicación DOF
  // más reciente que sea igual o anterior a la fecha de la factura.
  start.setUTCDate(start.getUTCDate() - 31);
  const startDate = start.toISOString().slice(0, 10);
  let latest = null;
  let lastError = null;
  for (const host of DOF_HOSTS) {
    const url = new URL(`https://${host}/indicadores_detalle.php`);
    url.searchParams.set('cod_tipo_indicador', '158');
    url.searchParams.set('dfecha', toDofDate(startDate));
    url.searchParams.set('hfecha', toDofDate(targetDate));
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'TraceFlow-MES/1.0 (consulta de tipo de cambio oficial)',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rates = parseDofRates(await response.text())
        .filter(({ date }) => date <= targetDate)
        .sort((a, b) => b.date.localeCompare(a.date));
      latest = rates[0] || null;
      if (latest) break;
      lastError = new Error(`La respuesta de ${host} no incluyó cotizaciones en el formato esperado.`);
    } catch (error) {
      lastError = error;
    }
  }
  if (!latest) {
    throw Object.assign(
      new Error(`No se pudo obtener del DOF una cotización para ${targetDate} ni para los 31 días anteriores. No se guardó el ingreso; intenta de nuevo más tarde.`),
      { statusCode: 502, cause: lastError }
    );
  }

  const value = {
    rate: latest.rate,
    date: latest.date,
    requestedDate: targetDate,
    source: 'Diario Oficial de la Federación · Tipo de cambio y tasas (indicador 158)',
  };
  cache.set(targetDate, { value, cachedAt: Date.now() });
  return value;
};

module.exports = { getUsdMxnRate, localDate };
