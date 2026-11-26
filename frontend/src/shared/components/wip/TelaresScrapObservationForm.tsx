import React, { useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

type Props = { area: 'LAMINADO' | 'GLOBO'; roll: { roll_code: string; qr_code: string; meters: number }; onSaved?: () => void };

export function TelaresScrapObservationForm({ area, roll, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true); setMessage('');
    try {
      const response = await axiosClient.post(`/${area.toLowerCase()}/wip/telares-scrap-observations`, {
        qr_code: roll.qr_code, meter_start: Number(start), meter_end: Number(end), reason,
      });
      const row = response.data?.data;
      setMessage(`Registrado: ${row.scrap_meters} m · ~${row.estimated_weight_kg} kg. Causa atribuida a Telares.`);
      setStart(''); setEnd(''); setReason(''); onSaved?.();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'No se pudo guardar el defecto. Verifica el QR y el tramo.');
    } finally { setSaving(false); }
  };
  return <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/10 p-3">
    <Button type="button" variant="outline" className="min-h-10 w-full text-amber-200" onClick={() => setOpen((value) => !value)}>
      {open ? 'Cerrar reporte de defecto de Telares' : 'Reportar defecto de Telares detectado al desenrollar'}
    </Button>
    {open && <div className="mt-3 space-y-3">
      <p className="text-xs text-slate-300">Rollo {roll.roll_code} · QR original {roll.qr_code}. Captura el rango en metros. El peso se estima según kg/m del rollo y se concilia al finalizar.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-slate-300">Desde (m)<Input type="number" min="0" max={roll.meters} step="0.01" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 min-h-10" /></label>
        <label className="text-xs font-semibold text-slate-300">Hasta (m)<Input type="number" min="0" max={roll.meters} step="0.01" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 min-h-10" /></label>
      </div>
      <label className="block text-xs font-semibold text-slate-300">Motivo observado<Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Ej. tejido roto, agujero, defecto de trama" className="mt-1 min-h-10" /></label>
      <Button type="button" className="min-h-10 w-full" disabled={saving || !start || !end || Number(end) <= Number(start) || Number(end) > Number(roll.meters) || !reason.trim()} onClick={submit}>{saving ? 'Guardando…' : 'Guardar defecto con trazabilidad'}</Button>
      {message && <p role="status" className="text-xs text-amber-100">{message}</p>}
    </div>}
  </div>;
}
