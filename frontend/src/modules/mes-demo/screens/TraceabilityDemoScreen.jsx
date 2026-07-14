import React, { useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { Search } from "lucide-react";

export default function TraceabilityDemoScreen() {
  const [qrCode, setQrCode] = useState("");
  const [traceabilityData, setTraceabilityData] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!qrCode.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setTraceabilityData(null);

    try {
      const response = await axiosClient.get(`/traceability/scan/${qrCode}`);
      setTraceabilityData(response.data);
    } catch (err) {
      setError(err.friendlyMessage || "Error al obtener trazabilidad");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Trazabilidad Completa</h1>

      <form onSubmit={handleScan} className="bg-card border border-border rounded-xl p-6 mb-6">
        <label className="block text-sm font-bold text-foreground mb-2">Escanear QR (Materia Prima, Mezcla, Rack o Rollo)</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="Ingrese el código QR..."
            className="flex-1 p-3 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
            required
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search size={20} />
            {isLoading ? "Buscando..." : "Rastrear"}
          </button>
        </div>
        {error && <div className="text-danger text-sm font-bold mt-3">{error}</div>}
      </form>

      {traceabilityData && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 col-span-2">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Información de la Entidad</h2>
              <p className="font-mono font-black text-2xl text-primary">{traceabilityData.entity?.code}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Tipo</p>
                  <p className="font-semibold text-foreground">{traceabilityData.entity?.entity_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Estado</p>
                  <p className="font-semibold text-foreground">{traceabilityData.entity?.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Cantidad Actual</p>
                  <p className="font-semibold text-foreground">
                    {traceabilityData.entity?.current_quantity || traceabilityData.entity?.quantity_produced}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Área</p>
                  <p className="font-semibold text-foreground">{traceabilityData.entity?.area_name || "Desconocida"}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Composición</h2>
              {traceabilityData.parents && traceabilityData.parents.length > 0 ? (
                <ul className="space-y-2">
                  {traceabilityData.parents.map((p, idx) => (
                    <li key={idx} className="flex flex-col p-2 bg-background rounded border border-border">
                      <span className="font-mono text-sm font-bold">{p.code}</span>
                      <span className="text-xs text-muted-foreground">{p.entity_type}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">Materia prima original o sin padres.</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">Línea de Tiempo de Operaciones</h2>
            
            {traceabilityData.events && traceabilityData.events.length > 0 ? (
              <div className="relative border-l-2 border-border ml-3 space-y-6">
                {traceabilityData.events.map((evt, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-card"></div>
                    <div className="bg-background border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-foreground">{evt.event_type}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                          {formatDate(evt.event_date || evt.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        Realizado por: <span className="font-semibold text-foreground">{evt.user_name || "Sistema"}</span> en {evt.area_name || "Área desconocida"}
                      </p>

                      {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                        <div className="mt-3 text-xs bg-card rounded p-2 border border-border/50">
                          <pre className="font-mono whitespace-pre-wrap text-muted-foreground">
                            {JSON.stringify(evt.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No hay eventos registrados para esta entidad.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
