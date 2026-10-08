import React, { useState, useEffect } from 'react';
import { Factory, QrCode, Loader2, Plus, Trash2, Scale } from 'lucide-react';
import { useExtrusionMixing } from '../../../extrusion/hooks/useExtrusionMixing';

export const MixingTerminalForm: React.FC<{ ticket?: any, onSuccess?: () => void }> = ({ ticket, onSuccess }) => {
  const { useFormulas, useMixFormula } = useExtrusionMixing();
  const { data: formulas, isLoading: loadingFormulas } = useFormulas();
  const mutation = useMixFormula();

  const [formulaId, setFormulaId] = useState('');
  const [outputIdentityTokenId, setOutputIdentityTokenId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Inputs state (multiple)
  const [inputs, setInputs] = useState<{qr_code: string; quantity: number}[]>([]);
  const [currentInputQr, setCurrentInputQr] = useState('');
  const [currentInputQty, setCurrentInputQty] = useState(0);

  useEffect(() => {
    if (ticket) {
      setFormulaId(ticket.formula_id.toString());
      setNotes(`Atendiendo solicitud: ${ticket.folio}`);
    }
  }, [ticket]);

  const handleAddInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInputQr || currentInputQty <= 0) return;
    setInputs(prev => [...prev, { qr_code: currentInputQr.trim().toUpperCase(), quantity: currentInputQty }]);
    setCurrentInputQr('');
    setCurrentInputQty(0);
  };

  const removeInput = (index: number) => {
    setInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaId || !outputIdentityTokenId || inputs.length === 0) {
      alert("Por favor, llene todos los campos requeridos y agregue al menos un insumo.");
      return;
    }

    mutation.mutate({
      formula_id: formulaId,
      preparation_id: ticket?.id,
      destination_qr_code: outputIdentityTokenId.trim().toUpperCase(),
      inputs,
      notes
    }, {
      onSuccess: () => {
        setFormulaId('');
        setOutputIdentityTokenId('');
        setInputs([]);
        setNotes('');
        setCurrentInputQr('');
        setCurrentInputQty(0);
        if (onSuccess) onSuccess();
      },
      onError: (err: any) => {
        alert("Error: " + (err.response?.data?.message || err.message));
      }
    });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
          <Factory size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Mezcladora de Extrusión (Mixer)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Left Column: Contexto */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Contexto de Operación
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fórmula (Receta)</label>
            <select
              required
              value={formulaId}
              onChange={(e) => setFormulaId(e.target.value)}
              disabled={!!ticket}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="" disabled>-- Seleccione Fórmula --</option>
              {formulas?.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {loadingFormulas && <p className="text-xs text-slate-400 mt-1">Cargando fórmulas...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código QR del Bote/Silo Destino (Vacío)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <QrCode size={16} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                required
                value={outputIdentityTokenId}
                onChange={(e) => setOutputIdentityTokenId(e.target.value)}
                placeholder="Ej. QR-MIX-001"
                className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono bg-yellow-50"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Debe ser un código QR en estado GENERATED.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas Adicionales</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Opcional..."
            />
          </div>
        </div>

        {/* Right Column: Insumos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Insumos (Escaneo desde WIP)
          </h3>
          
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="flex gap-2 items-end mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">QR Material Insumo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <QrCode size={14} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={currentInputQr}
                    onChange={(e) => setCurrentInputQr(e.target.value)}
                    className="w-full border border-slate-300 rounded pl-8 pr-2 py-1.5 text-sm uppercase font-mono"
                    placeholder="QR Origen"
                  />
                </div>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad (KG)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Scale size={14} className="text-slate-400" />
                  </div>
                  <input 
                    type="number"
                    value={currentInputQty || ''}
                    onChange={(e) => setCurrentInputQty(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded pl-8 pr-2 py-1.5 text-sm font-bold font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddInput}
                disabled={!currentInputQr || currentInputQty <= 0}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded p-1.5 h-[34px]"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="border border-slate-200 rounded-md bg-white overflow-hidden max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">QR</th>
                    <th className="px-3 py-2">Cant.</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {inputs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">No hay insumos agregados</td>
                    </tr>
                  ) : (
                    inputs.map((inp, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono uppercase text-xs">{inp.qr_code}</td>
                        <td className="px-3 py-2 font-bold">{inp.quantity} kg</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => removeInput(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {mutation.isSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Mezcla Generada Exitosamente</p>
            <p className="text-sm mt-1 opacity-90">Preparación completada y QR asociado correctamente.</p>
          </div>
          <div className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
            COMPLETED
          </div>
        </div>
      )}

      {mutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          <strong>Error en la operación: </strong> 
          {(mutation.error as any).response?.data?.message || (mutation.error as any).message}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={mutation.isPending || loadingFormulas || inputs.length === 0 || !formulaId || !outputIdentityTokenId}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="animate-spin" size={24} /> Procesando Mezcla...
          </>
        ) : (
          <>
            <Factory size={24} /> REGISTRAR MEZCLA EN SISTEMA
          </>
        )}
      </button>
    </div>
  );
};
