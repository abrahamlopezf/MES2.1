import axiosClient from '../../../api/axiosClient';

export const downloadConsumptionOrderPdf = async (order: any, filename?: string) => {
  const response = await axiosClient.get(`/warehouse/consumption-orders/${order.uuid}/print`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `ORD-${order.order_number}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
