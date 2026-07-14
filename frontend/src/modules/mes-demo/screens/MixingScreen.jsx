import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import { Plus, Trash2 } from "lucide-react";

export default function MixingScreen() {
  const [formulas, setFormulas] = useState([]);
  const [areas, setAreas] = useState([]);
  
  const [selectedFormula, setSelectedFormula] = useState("");
  const [sourceArea, setSourceArea] = useState("");
  const [targetArea, setTargetArea] = useState("");
  
  const [inputs, setInputs] = useState([{ qr_code: "", quantity: "" }]);
  const [destinationQr, setDestinationQr] = useState("");
  const [availableQrs, setAvailableQrs] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formulasRes, areasRes] = await Promise.all([
          axiosClient.get("/formulas"),
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
        setFormulas(extractArray(formulasRes));
        setAreas(extractArray(areasRes));
      } catch (err) {
        console.error("Error fetching data", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!targetArea) {
      setAvailableQrs([]);
      return;
    }
    const fetchQrs = async () => {
      try {
        const response = await axiosClient.get(`/qr/codes?status=DISPONIBLE&area_id=${targetArea}`);
        const extractArray = (res) => {
          if (Array.isArray(res.data?.data)) return res.data.data;
          if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
          if (Array.isArray(res.data?.message)) return res.data.message;
          if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
          if (Array.isArray(res.data)) return res.data;
          return [];
        };
        setAvailableQrs(extractArray(response));
      } catch (err) {
        console.error("Error fetching available QRs", err);
      }
    };
    fetchQrs();
  }, [targetArea]);

  const handleAddInput = () => {
    setInputs([...inputs, { qr_code: "", quantity: "" }]);
  };

  const handleRemoveInput = (index) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleInputChange = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const handlePrepare = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        formula_id: parseInt(selectedFormula, 10),
        source_area_id: parseInt(sourceArea, 10),
        target_area_id: parseInt(targetArea, 10),
        destination_qr_code: destinationQr,
        inputs: inputs.map(i => ({
          qr_code: i.qr_code,
          quantity: parseFloat(i.quantity)
        })),
        notes: "Demo Preparación de Mezcla",
      };
      
      const response = await axiosClient.post("/formulas/preparations", payload);
      setResult(response.data?.data || response.data?.message || response.data);
      
      setInputs([{ qr_code: "", quantity: "" }]);
      setDestinationQr("");
    } catch (err) {
      setError(err.friendlyMessage || "Error al preparar mezcla");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Preparación de Mezcla</h1>

      <div className="grid md:grid-cols-5 gap-6">
        <form onSubmit={handlePrepare} className="bg-card border border-border rounded-xl p-6 col-span-3">
          <h2 className="text-xl font-bold mb-4">Nueva Formulación</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-foreground mb-1">Fórmula a Preparar</label>
              <select 
                value={selectedFormula}
                onChange={(e) => setSelectedFormula(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              >
                <option value="">Selecciona fórmula...</option>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Área Origen (MP)</label>
              <select 
                value={sourceArea}
                onChange={(e) => setSourceArea(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              >
                <option value="">Selecciona área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Área Destino (Extrusión)</label>
              <select 
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                required
              >
                <option value="">Selecciona área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-foreground">Ingredientes (MP)</label>
              <button 
                type="button" 
                onClick={handleAddInput}
                className="text-xs flex items-center gap-1 font-bold text-primary hover:text-primary/80"
              >
                <Plus size={14} /> Añadir Ingrediente
              </button>
            </div>
            
            <div className="space-y-3">
              {inputs.map((input, index) => (
                <div key={index} className="flex gap-2">
                  <input 
                    type="text" 
                    value={input.qr_code}
                    onChange={(e) => handleInputChange(index, 'qr_code', e.target.value)}
                    placeholder="QR Bulto..."
                    className="flex-1 p-2 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
                    required
                  />
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.1"
                    value={input.quantity}
                    onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                    placeholder="KG"
                    className="w-24 p-2 rounded-lg bg-background border border-border text-foreground font-semibold focus:border-primary outline-none"
                    required
                  />
                  {inputs.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveInput(index)}
                      className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 border-t border-border pt-6">
            <label className="block text-sm font-bold text-foreground mb-1">Etiqueta Destino (QR Mezcla)</label>
            <input 
              type="text" 
              list="available-qrs"
              value={destinationQr}
              onChange={(e) => setDestinationQr(e.target.value)}
              placeholder="Escanea o selecciona etiqueta virgen..."
              className="w-full p-3 rounded-lg bg-background border border-border text-foreground font-mono font-semibold focus:border-primary outline-none"
              required
            />
            <datalist id="available-qrs">
              {availableQrs.map((qr) => (
                <option key={qr.id} value={qr.qr_code} />
              ))}
            </datalist>
          </div>

          {error && <div className="text-danger text-sm font-bold mt-4">{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-2 bg-primary text-primary-foreground font-bold p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Procesando..." : "Registrar Mezcla"}
          </button>
        </form>

        <div className="col-span-2">
          {result && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-success mb-2">Mezcla Creada</h2>
              <p className="font-medium text-foreground mb-4">La formulación se completó exitosamente.</p>
              
              <div className="p-4 bg-background rounded-lg border border-border">
                <p className="text-sm font-bold text-muted-foreground uppercase mb-1">QR Mezcla (MI)</p>
                <p className="font-mono font-black text-xl text-foreground">{destinationQr}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
