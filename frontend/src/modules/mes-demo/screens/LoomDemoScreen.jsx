import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";

export default function LoomDemoScreen() {
  const [materials, setMaterials] = useState([]);
  const [areas, setAreas] = useState([]);
  
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [activeRun, setActiveRun] = useState(null);
  
  // Inputs phase
  const [rackQr, setRackQr] = useState("");
  const [spools, setSpools] = useState("");

  // Finish phase
  const [virginQr, setVirginQr] = useState("");
  const [productionLength, setProductionLength] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsRes, areasRes] = await Promise.all([
          axiosClient.get("/materials"),
          axiosClient.get("/areas")
        ]);
        const extractArray = (res) => {
          if (Array.isArray(res.data?.data)) return res.data.data;
          if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
          if (Array.isArray(res.data?.message)) return res.data.message;
          if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
          if (Array.isArray(res.data)) return res.data;
          return [];
        };
        setMaterials(extractArray(materialsRes));
        setAreas(extractArray(areasRes));
      } catch (err) {
        console.error("Error fetching data", err);
      }
    };
    fetchData();
  }, []);

  const handleStartRun = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        station_id: parseInt(selectedArea, 10),
        target_material_id: parseInt(selectedMaterial, 10),
        notes: "Demo Telares - Inicio",
      };
      
      const response = await axiosClient.post("/processes/telares/start", payload);
      const activeRunData = response.data?.data?.run || response.data?.message?.run || response.data?.run;
      setActiveRun(activeRunData);
      setResult({ message: "Corrida de telar iniciada." });
    } catch (err) {
      setError(err.friendlyMessage || "Error al iniciar corrida");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterInput = async (e) => {
    e.preventDefault();
    if (!activeRun) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        rack_qr_code: rackQr,
        quantity_spools: parseInt(spools, 10),
        notes: "Demo Telares - Consumo",
      };
      
      const response = await axiosClient.post(`/processes/telares/${activeRun.id}/inputs`, payload);
      setResult({ 
        message: "Consumo de rack registrado.",
        details: response.data?.data || response.data?.message || response.data 
      });
      setRackQr("");
      setSpools("");
    } catch (err) {
      setError(err.friendlyMessage || "Error al registrar consumo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishRun = async (e) => {
    e.preventDefault();
    if (!activeRun) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        virgin_qr_code: virginQr,
        quantity_produced: parseFloat(productionLength),
        unit: "MTS",
        notes: "Demo Telares - Finalización",
      };
      
      const response = await axiosClient.post(`/processes/telares/${activeRun.id}/finish`, payload);
      setResult({ 
        message: "Rollo de tela producido y corrida finalizada.",
        details: response.data?.data || response.data?.message || response.data 
      });
      setActiveRun(null);
      setVirginQr("");
      setProductionLength("");
    } catch (err) {
      setError(err.friendlyMessage || "Error al finalizar corrida");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Proceso de Telar</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {!activeRun ? (
            <form onSubmit={handleStartRun} className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Iniciar Corrida</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Estación / Línea</label>
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
                  <label className="block text-sm font-bold text-foreground mb-1">Producto a fabricar</label>
                  <select 
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                    required
                  >
                    <option value="">Selecciona producto...</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && !activeRun && <div className="text-danger text-sm font-bold mt-4">{error}</div>}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-6 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Iniciando..." : "Iniciar Telares"}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Consumo de Hilo</h2>
                  <span className="bg-warning/20 text-warning text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">Activa</span>
                </div>
                
                <p className="font-mono font-black text-lg text-foreground mb-4">{activeRun.code}</p>

                <form onSubmit={handleRegisterInput} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1">QR Rack Origen</label>
                    <input 
                      type="text" 
                      value={rackQr}
                      onChange={(e) => setRackQr(e.target.value)}
                      placeholder="Escanea el QR del Rack..."
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
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-secondary text-primary font-bold p-3 rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Registrar Consumo
                  </button>
                </form>
              </div>

              <form onSubmit={handleFinishRun} className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Finalizar y Producir Tela</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1">QR Virgen (Destino Rollo)</label>
                    <input 
                      type="text" 
                      value={virginQr}
                      onChange={(e) => setVirginQr(e.target.value)}
                      placeholder="QR de la etiqueta nueva..."
                      className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1">Producción (Metros)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={productionLength}
                      onChange={(e) => setProductionLength(e.target.value)}
                      className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full mt-6 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Procesando..." : "Finalizar y Producir"}
                </button>
              </form>
            </div>
          )}
          {error && <div className="text-danger text-sm font-bold mt-4">{error}</div>}
        </div>

        <div>
          {result && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-success mb-2">Operación Exitosa</h2>
              <p className="font-medium text-foreground mb-4">{result.message}</p>
              
              {result.details && result.details.output && (
                <div className="p-4 bg-background rounded-lg border border-border mt-4">
                  <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Rollo Generado</p>
                  <p className="font-mono font-black text-xl text-foreground">{result.details.output.target_entity_code || virginQr}</p>
                  <p className="font-bold text-foreground mt-2">{productionLength} MTS</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
