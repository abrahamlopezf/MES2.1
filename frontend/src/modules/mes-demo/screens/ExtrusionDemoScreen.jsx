import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";

export default function ExtrusionDemoScreen() {
  const [areas, setAreas] = useState([]);
  
  const [selectedArea, setSelectedArea] = useState("");
  const [mixingQr, setMixingQr] = useState("");
  const [activeRun, setActiveRun] = useState(null);
  
  const [rackQr, setRackQr] = useState("");
  const [spools, setSpools] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await axiosClient.get("/areas");
        const extractArray = (res) => {
          if (Array.isArray(res.data?.data)) return res.data.data;
          if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
          if (Array.isArray(res.data?.message)) return res.data.message;
          if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
          if (Array.isArray(res.data)) return res.data;
          return [];
        };
        setAreas(extractArray(response));
      } catch (err) {
        console.error("Error fetching areas", err);
      }
    };
    fetchAreas();
  }, []);

  const handleStartRun = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        station_id: parseInt(selectedArea, 10),
        mixing_qr_code: mixingQr,
        notes: "Demo Extrusión",
      };
      
      const response = await axiosClient.post("/processes/start", payload);
      const activeRunData = response.data?.data?.run || response.data?.message?.run || response.data?.run;
      setActiveRun(activeRunData);
      setResult({ message: "Corrida iniciada correctamente." });
    } catch (err) {
      setError(err.friendlyMessage || "Error al iniciar corrida");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOutput = async (e) => {
    e.preventDefault();
    if (!activeRun) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        rack_qr_code: rackQr,
        quantity_spools: parseInt(spools, 10),
        notes: "Demo Extrusión - Salida",
      };
      
      const response = await axiosClient.post(`/processes/${activeRun.id}/outputs`, payload);
      setResult({ 
        message: "Producción registrada exitosamente.",
        output: response.data?.data || response.data?.message || response.data 
      });
      setRackQr("");
      setSpools("");
    } catch (err) {
      setError(err.friendlyMessage || "Error al registrar producción");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Proceso de Extrusión</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {!activeRun ? (
            <form onSubmit={handleStartRun} className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Iniciar Corrida</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Estación / Máquina</label>
                  <select 
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                    required
                  >
                    <option value="">Selecciona estación...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">QR Mezcla Origen (Material Inventory)</label>
                  <input 
                    type="text" 
                    value={mixingQr}
                    onChange={(e) => setMixingQr(e.target.value)}
                    placeholder="Escanea el código de la mezcla..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
                    required
                  />
                </div>
              </div>

              {error && !activeRun && <div className="text-danger text-sm font-bold mt-4">{error}</div>}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-6 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Iniciando..." : "Iniciar Extrusión"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterOutput} className="bg-card border border-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Registro de Salida (PTI)</h2>
                <span className="bg-warning/20 text-warning text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">Activa</span>
              </div>
              
              <p className="font-mono font-black text-lg text-foreground mb-4">{activeRun.code}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">QR Virgen (Destino Rack)</label>
                  <input 
                    type="text" 
                    value={rackQr}
                    onChange={(e) => setRackQr(e.target.value)}
                    placeholder="QR de la etiqueta nueva..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Cantidad (Carretes)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={spools}
                    onChange={(e) => setSpools(e.target.value)}
                    className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                    required
                  />
                </div>
              </div>

              {error && <div className="text-danger text-sm font-bold mt-4">{error}</div>}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-6 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Procesando..." : "Generar Rack (PTI)"}
              </button>
            </form>
          )}
        </div>

        <div>
          {result && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-success mb-2">Operación Exitosa</h2>
              <p className="font-medium text-foreground mb-4">{result.message}</p>
              
              {result.output && (
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Rack Generado</p>
                  <p className="font-mono font-black text-xl text-foreground">{result.output.target_entity_code || rackQr}</p>
                  <p className="font-bold text-foreground mt-2">{spools} Carretes</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
