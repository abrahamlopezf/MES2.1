import React, { useState } from 'react';
import { useCreatePrintJobMutation } from '../hooks/usePrintPipeline';

export function PrintBatchPage() {
  const mutation = useCreatePrintJobMutation();
  const [batchId, setBatchId] = useState('');
  const [templateId, setTemplateId] = useState('TEMPLATE_QR_01');

  const handlePrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) return;

    // Idempotency Key es generada en el front para cada intento
    // pero idealmente se mantiene igual si es la misma intención
    const idempotencyKey = `PRINT-${batchId}-${templateId}-${Date.now()}`;

    mutation.mutate({
      batchId,
      templateId,
      idempotencyKey,
      requestedBy: 'operator-1'
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Pipeline de Impresión</h2>
      
      <form onSubmit={handlePrint} className="bg-white p-6 rounded-lg shadow border border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Batch ID a imprimir</label>
          <input 
            type="text" 
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="Ej. BATCH-0001"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plantilla de Etiqueta</label>
          <select 
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="TEMPLATE_QR_01">Etiqueta QR Producción (ZPL)</option>
            <option value="TEMPLATE_BARCODE_02">Código de Barras Cajas (TSPL)</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={mutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Enviando a cola de impresión...' : 'IMPRIMIR ETIQUETAS'}
        </button>
      </form>

      {mutation.isSuccess && mutation.data && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h3 className="text-green-800 font-semibold flex items-center gap-2">
            <span>✓</span> {mutation.data.message}
          </h3>
          <p className="text-sm text-green-700 mt-2">
            Job ID: <span className="font-mono">{mutation.data.jobId}</span>
          </p>
          <p className="text-sm text-green-700">Estado: {mutation.data.status}</p>
        </div>
      )}

      {mutation.isError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="text-red-800 font-semibold flex items-center gap-2">
            <span>✕</span> Error de Impresión
          </h3>
          <p className="text-sm text-red-700 mt-2">{mutation.error.message}</p>
        </div>
      )}
    </div>
  );
}
