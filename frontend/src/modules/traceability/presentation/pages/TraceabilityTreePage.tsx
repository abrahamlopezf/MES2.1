import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileSearch, ArrowLeft } from 'lucide-react';

export function TraceabilityTreePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-muted-foreground">
        No se especificó un ID de token para analizar.
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm mx-auto block"
        >
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Regresar
        </button>
      </div>

      <div className="bg-card p-8 rounded-lg shadow-sm border border-border">
        <div className="flex items-center gap-4 border-b border-border pb-6 mb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <FileSearch size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Árbol de Trazabilidad</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{tokenId}</p>
          </div>
        </div>

        {/* Simulando el estado inicial VIRGIN/NEW de un QR recién nacido */}
        <div className="relative pl-8 border-l-2 border-primary/20 space-y-8 py-4">
          
          <div className="relative">
            <div className="absolute -left-10 w-4 h-4 bg-primary rounded-full ring-4 ring-background mt-1"></div>
            <div className="bg-muted/30 border border-border rounded-md p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-foreground">Identidad Generada</h3>
                  <p className="text-xs text-muted-foreground">Origen de Nacimiento</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                  VIRGIN
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                El código industrial ha sido generado y el token está esperando ser asociado a material físico (asignación en Almacén o Extrusión).
              </p>
            </div>
          </div>

          <div className="relative opacity-50">
            <div className="absolute -left-10 w-4 h-4 bg-muted-foreground/30 rounded-full ring-4 ring-background mt-1"></div>
            <div className="bg-muted/10 border border-dashed border-border rounded-md p-4">
              <h3 className="font-semibold text-muted-foreground">Asignación Física (Pendiente)</h3>
              <p className="text-xs text-muted-foreground/70 mt-1">Esperando primer escaneo operativo...</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
