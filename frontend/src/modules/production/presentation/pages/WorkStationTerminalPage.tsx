import React from 'react';
import { StartRunForm } from '../components/StartRunForm';

export default function WorkStationTerminalPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terminal de Producción</h1>
        <p className="text-slate-500 mt-2">Gestión y ejecución de corridas en estaciones de trabajo.</p>
      </div>

      <StartRunForm />
    </div>
  );
}
