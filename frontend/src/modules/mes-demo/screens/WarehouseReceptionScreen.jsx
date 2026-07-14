import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";

export default function WarehouseReceptionScreen() {
  const [qrCode, setQrCode] = useState("");
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axiosClient.get("/materials");
        const extractArray = (res) => {
          if (Array.isArray(res.data?.data)) return res.data.data;
          if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
          if (Array.isArray(res.data?.message)) return res.data.message;
          if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
          if (Array.isArray(res.data)) return res.data;
          return [];
        };
        setMaterials(extractArray(response));
      } catch (err) {
        console.error("Error fetching materials", err);
      }
    };
    fetchMaterials();
  }, []);

  const handleReceive = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        qr_code: qrCode,
        material_id: parseInt(selectedMaterial, 10),
        quantity: parseFloat(quantity),
        location: "ALMACEN MP",
        notes: "Demo Recepción",
      };
      
      const response = await axiosClient.post("/material-inventory/reception", payload);
      setResult(response.data);
      setQrCode("");
      setQuantity("");
    } catch (err) {
      setError(err.friendlyMessage || "Error al recibir material");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Recepción de Materiales</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleReceive} className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Escanear y Recibir</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Código QR</label>
              <input 
                type="text" 
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Escanea o escribe el QR..."
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Material</label>
              <select 
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              >
                <option value="">Selecciona un material...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
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
            disabled={isLoading}
            className="w-full mt-6 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Procesando..." : "Registrar Recepción"}
          </button>
        </form>

        {result && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-success mb-2">Recepción Exitosa</h2>
            <p className="font-medium text-foreground mb-1">Item: <span className="font-bold font-mono">{result.item?.qr_code}</span></p>
            <p className="font-medium text-foreground mb-1">Cantidad: {result.item?.current_quantity}</p>
            <p className="font-medium text-foreground">Estado: {result.item?.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
