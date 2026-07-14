import axios from 'axios';

// Usamos withCredentials si tenemos autenticación por cookies (como vimos en auth)
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true
});

// Nota: Como no tenemos una sesión viva en el ambiente de testing ahora mismo,
// es posible que el backend retorne 401. Si es así, pediremos login luego o lo mockearemos.

export const getInventoryReport = async () => {
  const { data } = await api.get('/reports/inventory');
  return data.data;
};

export const getPurchasesReport = async () => {
  const { data } = await api.get('/reports/purchases');
  return data.data;
};

export const getYieldReport = async () => {
  const { data } = await api.get('/reports/production/yield');
  return data.data;
};

export const getScrapReport = async () => {
  const { data } = await api.get('/reports/scrap');
  return data.data;
};
