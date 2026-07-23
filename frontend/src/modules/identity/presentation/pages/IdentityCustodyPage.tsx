import React, { useState } from 'react';
import { useTransferCustodyMutation, useCustodySnapshotQuery } from '../hooks/useCustodyPipeline';
import { TransferReason } from '../../domain/valueObjects/CustodyValueObjects';
import { CustodyTimeline } from '../components/CustodyTimeline';

export function IdentityCustodyPage() {
  const [scannedCode, setScannedCode] = useState('MTY-26-EXT-000001'); // Valor por defecto para pruebas
  const [destination, setDestination] = useState('EXTRUSION');
  const [reason, setReason] = useState<TransferReason>(TransferReason.PRODUCTION_START);

  const { data: snapshot, isLoading, isError } = useCustodySnapshotQuery(scannedCode);
  const transferMutation = useTransferCustodyMutation();

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode || !destination) return;

    transferMutation.mutate({
      identityTokenId: scannedCode,
      destinationOwner: destination,
      reason: reason,
      actorId: 'operator-ext-1'
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Transferencia de Custodia (Escáner)</h2>

      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-1">Escanear Código QR</label>
        <input 
          type="text" 
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          placeholder="Ej. MTY-26-EXT-000001"
          className="w-full border border-slate-300 rounded px-3 py-2 text-xl font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none uppercase"
        />
      </div>

      {isLoading && <p className="text-slate-500 text-center">Buscando token en el Ledger...</p>}
      
      {snapshot && (
        <form onSubmit={handleTransfer} className="bg-white p-6 rounded-lg shadow border border-slate-200 space-y-6">
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Estado Actual</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Propietario Actual</p>
                <p className="font-medium text-slate-900">{snapshot.currentOwner}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total de Movimientos</p>
                <p className="font-medium text-slate-900">{snapshot.totalMovements}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Última Actividad</p>
                <p className="font-medium text-slate-900">{new Date(snapshot.lastMovementAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Nuevo Movimiento</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mover a (Destino)</label>
              <select 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="EXTRUSION">Área Extrusión</option>
                <option value="CORTE">Área Corte</option>
                <option value="LAMINADO">Área Laminado</option>
                <option value="ALMACEN_CENTRAL">Almacén Central</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value as TransferReason)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={TransferReason.PRODUCTION_START}>Inicio de Producción</option>
                <option value={TransferReason.QUALITY_CHECK}>Inspección de Calidad</option>
                <option value={TransferReason.STORAGE}>Almacenamiento</option>
                <option value={TransferReason.REWORK}>Retrabajo</option>
                <option value={TransferReason.SCRAP}>Scrap / Merma</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={transferMutation.isPending || snapshot.currentOwner === destination}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded transition-colors disabled:opacity-50 text-lg"
            >
              {transferMutation.isPending ? 'REGISTRANDO...' : 'TRANSFERIR CUSTODIA'}
            </button>
            
            {snapshot.currentOwner === destination && (
              <p className="text-sm text-red-500 text-center">El destino no puede ser igual al propietario actual.</p>
            )}
          </div>
        </form>
      )}

      {transferMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
          <h3 className="text-green-800 font-semibold">✓ Transferencia registrada en el Ledger</h3>
        </div>
      )}

      {transferMutation.isError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="text-red-800 font-semibold flex items-center gap-2">
            <span>✕</span> Error en la Transferencia
          </h3>
          <p className="text-sm text-red-700 mt-2">{transferMutation.error.message}</p>
        </div>
      )}

      {/* Trazabilidad Visual */}
      {snapshot && (
        <CustodyTimeline identityTokenId={scannedCode} />
      )}
    </div>
  );
}
