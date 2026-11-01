import React from 'react';
import { StartRunForm } from '../components/StartRunForm';

export default function WorkStationTerminalPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Terminal de Producción</h1>
        <p className="mt-2 text-base text-muted-foreground">Gestión y ejecución de corridas en estaciones de trabajo.</p>
      </div>

      <StartRunForm />
    </div>
  );
}
