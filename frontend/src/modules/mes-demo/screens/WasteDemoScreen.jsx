import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";

export default function WasteDemoScreen() {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState("GENERACION");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchContainers = async () => {
    try {
      const response = await axiosClient.get("/scrap/containers");
      const extractArray = (res) => {
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
        if (Array.isArray(res.data?.message)) return res.data.message;
        if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
        if (Array.isArray(res.data)) return res.data;
        return [];
      };
      setContainers(extractArray(response));
    } catch (err) {
      console.error("Error fetching containers", err);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const handleRegisterWaste = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        container_id: parseInt(selectedContainer, 10),
        quantity: parseFloat(quantity),
        movement_type: movementType,
        notes: "Demo Registro de Scrap",
      };
      
      const response = await axiosClient.post("/scrap/movements", payload);
      setResult({ 
        message: "Movimiento registrado exitosamente.",
        movement: response.data 
      });
      setQuantity("");
      
      // Update container list to reflect new weight
      fetchContainers();
    } catch (err) {
      setError(err.friendlyMessage || "Error al registrar scrap");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Registro de Scrap y Merma</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleRegisterWaste} className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Nuevo Movimiento</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Tipo de Movimiento</label>
              <select 
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              >
                <option value="GENERACION">Generación (Entrada a contenedor)</option>
                <option value="SALIDA_RECICLAJE">Salida a Reciclaje</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Contenedor</label>
              <select 
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              >
                <option value="">Selecciona contenedor...</option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>{c.qr_code} - Actual: {c.current_weight} KG</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Cantidad (KG)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              />
            </div>
          </div>

          {error && <div className="text-danger text-sm font-bold mt-4">{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading || !selectedContainer}
            className="w-full mt-6 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Registrando..." : "Registrar Movimiento"}
          </button>
        </form>

        <div>
          {result && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-success mb-2">Operación Exitosa</h2>
              <p className="font-medium text-foreground">{result.message}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Estado de Contenedores</h2>
            <div className="space-y-3">
              {containers.length === 0 && <p className="text-muted-foreground text-sm">No hay contenedores registrados.</p>}
              {containers.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-background">
                  <div>
                    <p className="font-bold font-mono text-sm">{c.qr_code}</p>
                    <p className="text-xs text-muted-foreground">{c.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-primary">{c.current_weight} KG</p>
                    <p className="text-xs text-muted-foreground">Capacidad: {c.capacity_weight} KG</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
