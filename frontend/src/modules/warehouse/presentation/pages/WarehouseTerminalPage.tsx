import React from 'react';
import { WarehouseEntryForm } from '../components/WarehouseEntryForm';

export const WarehouseTerminalPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Terminal de Almacén</h1>
        <p className="text-slate-600 mt-2">Recepción física de material a través de escaneo de QR virgen.</p>
      </div>
      
      <WarehouseEntryForm />
    </div>
  );
};
