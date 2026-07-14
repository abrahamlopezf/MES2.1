import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import { Search, Loader2 } from "lucide-react";

export default function QRHistoryScreen() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qrs, setQrs] = useState([]);
  const [loadingQrs, setLoadingQrs] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await axiosClient.get("/qr/batches");
      const extractArray = (res) => {
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
        if (Array.isArray(res.data?.message)) return res.data.message;
        if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
        if (Array.isArray(res.data)) return res.data;
        return [];
      };
      setBatches(extractArray(res));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const viewBatchDetails = async (batchId) => {
    setSelectedBatch(batchId);
    setLoadingQrs(true);
    try {
      const res = await axiosClient.get(`/qr/codes`);
      const extractArray = (res) => {
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
        if (Array.isArray(res.data?.message)) return res.data.message;
        if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
        if (Array.isArray(res.data)) return res.data;
        return [];
      };
      const payload = extractArray(res);
      const filtered = payload.filter(qr => qr.batch_id === batchId);
      setQrs(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingQrs(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Gestión QR: Historial de Lotes</h1>
      
      {/* Lotes */}
      <div className="bg-surface rounded-xl shadow border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Lotes Generados</h2>
        {loading ? (
          <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Cargando lotes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="p-3">Lote</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Generado por</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Área Asignada</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => (
                  <tr key={batch.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-mono text-sm">{batch.batch_code}</td>
                    <td className="p-3">{new Date(batch.created_at).toLocaleString()}</td>
                    <td className="p-3">{batch.created_by?.username}</td>
                    <td className="p-3">{batch.quantity}</td>
                    <td className="p-3">{batch.assigned_area?.name || "Sin asignar"}</td>
                    <td className="p-3">{batch.status}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => viewBatchDetails(batch.id)}
                        className="bg-primary/10 text-primary px-3 py-1 rounded font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalles del Lote */}
      {selectedBatch && (
        <div className="bg-surface rounded-xl shadow border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Códigos QR del Lote</h2>
          {loadingQrs ? (
             <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Cargando detalles...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="p-3">Código QR</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Área Asignada</th>
                    <th className="p-3">Ubicación Actual</th>
                    <th className="p-3">Tipo Entidad</th>
                  </tr>
                </thead>
                <tbody>
                  {qrs.map(qr => (
                    <tr key={qr.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-mono text-sm font-bold">{qr.qr_code}</td>
                      <td className="p-3">{qr.status}</td>
                      <td className="p-3">{qr.assigned_area?.name || "N/A"}</td>
                      <td className="p-3">{qr.current_area?.name || "N/A"}</td>
                      <td className="p-3">{qr.entity_type || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
