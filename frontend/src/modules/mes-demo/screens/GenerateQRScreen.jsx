import React, { useState } from "react";
import axiosClient from "../../../api/axiosClient";

export default function GenerateQRScreen() {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBatchResult(null);

    try {
      const response = await axiosClient.post('/qr/batches', {
        quantity: parseInt(quantity, 10),
        notes: "Lote de Demo MES",
      });
      setBatchResult(response.data);
    } catch (err) {
      setError(err.friendlyMessage || "Error al generar QR");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Generación e Impresión QR</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleGenerate} className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Generar Lote</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-bold text-foreground mb-2">Cantidad de QRs</label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
              required
            />
          </div>

          {error && <div className="text-danger text-sm font-bold mb-4">{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Generando..." : "Generar QRs"}
          </button>
        </form>

        {batchResult && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-success mb-2">Lote Generado Exitosamente</h2>
            <p className="font-medium text-foreground mb-1">Lote: <span className="font-bold">{batchResult.batch?.batch_number}</span></p>
            <p className="font-medium text-foreground mb-4">Cantidad: {batchResult.batch?.quantity_generated}</p>

            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Códigos (Primeros 5)</h3>
            <div className="space-y-2">
              {batchResult.codes?.slice(0, 5).map((code) => (
                <div key={code} className="bg-background p-2 rounded border border-border font-mono text-sm font-bold">
                  {code}
                </div>
              ))}
            </div>
            
            {batchResult.codes?.length > 5 && (
              <p className="text-sm text-muted-foreground mt-2 font-bold">... y {batchResult.codes.length - 5} más</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
