import React from 'react';
import { MixingTerminalForm } from '../components/MixingTerminalForm';

export const MixingTerminalPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Terminal de Mezclado</h1>
        <p className="text-slate-600 mt-2">Ejecución de MixTransformation (Inputs → MixBatch).</p>
      </div>
      
      <MixingTerminalForm />
    </div>
  );
};
