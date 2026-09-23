import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Order {
  uuid: string;
  order_number: string;
  status: string;
  created_at: string;
  notes: string;
  requester: { first_name: string; name?: string; last_name: string };
  requesting_area?: { name: string };
  items: Array<{
    requested_quantity: string;
    material: { name: string; material_code: string };
    lote?: { folio: string };
    unit?: { abbreviation: string };
  }>;
}

export const ConsumptionOrderPrintTemplate: React.FC<{ order: Order }> = ({ order }) => {
  const qrValue = (order as any).encrypted_qr || `ORD-${order.uuid}`;

  return (
    <div className="bg-white text-black font-sans p-8 w-[800px] mx-auto" id="order-print-template">
      <style>
        {`
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>
      
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
        <div>
          <h1 className="text-4xl font-black mb-1 uppercase tracking-tighter">Orden de Consumo</h1>
          <p className="text-gray-600 text-sm">Documento interno de almacén y producción</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold">{order.order_number}</h2>
          <p className="text-gray-600 font-medium">Fecha: {new Date(order.created_at).toLocaleString()}</p>
          <p className="text-gray-600 font-medium font-mono text-xs mt-1">UUID: {order.uuid}</p>
        </div>
      </div>

      {/* Main Info */}
      <div className="flex flex-row justify-between mb-8 gap-8">
        <div className="flex-1 border border-black p-4 rounded-lg">
          <h3 className="text-sm uppercase font-bold text-gray-500 mb-3 border-b border-gray-300 pb-1">Datos de la Solicitud</h3>
          <div className="mb-2">
            <span className="font-semibold w-24 inline-block">Solicitante:</span>
            <span>{order.requester?.name || order.requester?.first_name} {order.requester?.last_name}</span>
          </div>
          <div className="mb-2">
            <span className="font-semibold w-24 inline-block">Área:</span>
            <span>{order.requesting_area?.name || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold w-24 inline-block">Estado:</span>
            <span className="uppercase font-bold">{order.status}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center border border-black p-4 rounded-lg bg-gray-50 w-48 shrink-0">
          <QRCodeSVG value={qrValue} size={120} level="H" />
          <p className="text-[10px] font-mono mt-2 text-center break-all">{qrValue}</p>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-8 p-4 border-l-4 border-black bg-gray-100">
          <h3 className="text-sm font-bold uppercase mb-1">Notas / Justificación</h3>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      {/* Materials Table */}
      <h3 className="text-xl font-bold mb-4">Materiales Solicitados</h3>
      <table className="w-full border-collapse border border-black mb-8">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black p-3 text-left font-bold w-16">No.</th>
            <th className="border border-black p-3 text-left font-bold">Código</th>
            <th className="border border-black p-3 text-left font-bold">Material</th>
            <th className="border border-black p-3 text-center font-bold">Lote Asignado (FIFO)</th>
            <th className="border border-black p-3 text-right font-bold w-32">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, index) => (
            <tr key={index}>
              <td className="border border-black p-3 text-center">{index + 1}</td>
              <td className="border border-black p-3 font-mono text-sm">{item.material?.material_code}</td>
              <td className="border border-black p-3 font-medium">{item.material?.name}</td>
              <td className="border border-black p-3 text-center font-mono text-sm">{item.lote?.folio || 'N/A'}</td>
              <td className="border border-black p-3 text-right">
                <span className="font-bold text-lg">{parseFloat(item.requested_quantity).toFixed(2)}</span>
                <span className="text-xs ml-1 text-gray-600">{item.unit?.abbreviation || 'Unidades'}</span>
              </td>
            </tr>
          ))}
          {(!order.items || order.items.length === 0) && (
            <tr>
              <td colSpan={5} className="border border-black p-6 text-center italic text-gray-500">
                Esta orden no contiene materiales
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signatures */}
      <div className="flex justify-between mt-16 pt-8 border-t border-gray-300">
        <div className="w-64 text-center">
          <div className="border-b border-black mb-2 h-10"></div>
          <p className="font-bold text-sm">Firma de Entrega (Almacén)</p>
          <p className="text-xs text-gray-500">Nombre y Firma</p>
        </div>
        <div className="w-64 text-center">
          <div className="border-b border-black mb-2 h-10"></div>
          <p className="font-bold text-sm">Firma de Recibido (Producción)</p>
          <p className="text-xs text-gray-500">Nombre y Firma</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-12 text-center text-xs text-gray-400">
        <p>Documento generado automáticamente por MES. Escanee el código QR central para consultar el estado en tiempo real.</p>
      </div>

    </div>
  );
};
