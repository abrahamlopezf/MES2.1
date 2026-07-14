import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import { Loader2 } from "lucide-react";

export default function QRAssignmentsScreen() {
  const [batches, setBatches] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [quantity, setQuantity] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [batchesRes, areasRes] = await Promise.all([
        axiosClient.get("/qr/batches?status=CREATED"),
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
      setBatches(extractArray(batchesRes));
      setAreas(extractArray(areasRes));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axiosClient.post("/qr/assign", {
        batch_id: selectedBatch,
        area_id: selectedArea,
        quantity: parseInt(quantity, 10)
      });
      setResult({
        message: "Códigos QR asignados correctamente.",
        details: response.data?.data || response.data?.message || response.data
      });
      setQuantity("");
      setSelectedBatch("");
      fetchData();
    } catch (error) {
      console.error(error);
      setError(error.friendlyMessage || "Error al asignar los códigos QR. Verifique los datos e intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Gestión QR: Asignaciones</h1>
      
      <div className="bg-surface rounded-xl shadow border border-border p-6 max-w-xl">
        <h2 className="text-xl font-bold mb-4">Asignar Lote a Área</h2>
        {loading ? (
          <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : (
          <form onSubmit={handleAssign} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Lote (Pendiente)</label>
              <select required className="w-full p-2 border rounded bg-background" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                <option value="">Seleccione un lote...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.batch_code} (Disponibles: {b.available_quantity ?? b.quantity})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1">Área Destino</label>
              <select required className="w-full p-2 border rounded bg-background" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                <option value="">Seleccione un área...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Cantidad a Asignar</label>
              <input type="number" required className="w-full p-2 border rounded bg-background" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>

            {error && <div className="text-danger text-sm font-bold mt-2">{error}</div>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-primary text-primary-foreground font-bold p-3 rounded-lg mt-4 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Procesando..." : "Confirmar Asignación"}
            </button>
          </form>
        )}
      </div>

      {result && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-6 max-w-xl">
          <h2 className="text-xl font-bold text-success mb-2">Asignación Exitosa</h2>
          <p className="font-medium text-foreground mb-4">{result.message}</p>
          
          <div className="p-4 bg-background rounded-lg border border-border">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Área Destino</p>
            <p className="font-bold text-lg text-foreground mb-3">{result.details?.area?.name || "Asignado"}</p>
            
            <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Cantidad Asignada</p>
            <p className="font-mono font-black text-xl text-primary">{result.details?.assigned_quantity || quantity} QRs</p>
          </div>
        </div>
      )}
    </div>
  );
}
