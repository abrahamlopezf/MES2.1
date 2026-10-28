'use strict';

let cachedRate = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

const getUsdMxnRate = async () => {
  if (cachedRate && Date.now() - cachedAt < CACHE_MS) return cachedRate;

  const token = process.env.BANXICO_API_TOKEN;
  if (!token) {
    throw Object.assign(new Error('Falta configurar BANXICO_API_TOKEN para consultar el tipo de cambio oficial.'), { statusCode: 503 });
  }

  const response = await fetch('https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno', {
    headers: { 'Bmx-Token': token, Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Banco de México no respondió el tipo de cambio (HTTP ${response.status}).`), { statusCode: 502 });
  }

  const payload = await response.json();
  const latest = payload?.bmx?.series?.[0]?.datos?.[0];
  const rate = Number(String(latest?.dato || '').replace(/,/g, ''));
  if (!Number.isFinite(rate) || rate <= 0 || !latest?.fecha) {
    throw Object.assign(new Error('Banco de México no devolvió una cotización FIX válida.'), { statusCode: 502 });
  }

  cachedRate = { rate, date: latest.fecha, source: 'Banco de México · serie SF43718 (FIX)' };
  cachedAt = Date.now();
  return cachedRate;
};

module.exports = { getUsdMxnRate };
