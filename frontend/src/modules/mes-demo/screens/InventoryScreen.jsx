import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import { Boxes, Loader2 } from "lucide-react";

export default function InventoryScreen() {
  const [materials, setMaterials] = useState([]);
  const [containers, setContainers] = useState([]);
  const [intermediate, setIntermediate] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [matRes, scrapRes, intRes] = await Promise.all([
        axiosClient.get("/materials"),
        axiosClient.get("/scrap/containers"),
        axiosClient.get("/intermediate/stocks")
      ]);
      const extractArray = (res) => {
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
        if (Array.isArray(res.data?.message)) return res.data.message;
        if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
        if (Array.isArray(res.data)) return res.data;
        return [];
      };

      setMaterials(extractArray(matRes));
      setContainers(extractArray(scrapRes));
      setIntermediate(extractArray(intRes));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Boxes size={32} /> Inventario General
      </h1>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Cargando inventarios...</div>
      ) : (
        <div className="flex flex-col gap-6">
          
          <div className="bg-surface rounded-xl shadow border border-border p-6">
            <h2 className="text-xl font-bold mb-4">Catálogo de Materiales (MP / MS)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted text-muted-foreground">
                    <th className="p-3">Código</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(m => (
                    <tr key={m.id} className="border-b">
                      <td className="p-3 font-bold">{m.code}</td>
                      <td className="p-3">{m.name}</td>
                      <td className="p-3">{m.material_type}</td>
                      <td className="p-3">{m.default_unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface rounded-xl shadow border border-border p-6">
            <h2 className="text-xl font-bold mb-4">Stock Intermedio (Carretes / Rollos)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted text-muted-foreground">
                    <th className="p-3">Material</th>
                    <th className="p-3">Rack</th>
                    <th className="p-3">Cantidad Primaria</th>
                    <th className="p-3">Cantidad Secundaria</th>
                  </tr>
                </thead>
                <tbody>
                  {intermediate.map(i => (
                    <tr key={i.id} className="border-b">
                      <td className="p-3 font-bold">{i.intermediate_material?.name || i.intermediate_material_id}</td>
                      <td className="p-3">{i.rack?.code || i.rack_id}</td>
                      <td className="p-3 text-primary font-bold">{i.quantity_primary}</td>
                      <td className="p-3 text-secondary-foreground">{i.quantity_secondary}</td>
                    </tr>
                  ))}
                  {intermediate.length === 0 && (
                    <tr><td colSpan="4" className="p-3 text-center text-muted-foreground">Sin inventario intermedio registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface rounded-xl shadow border border-border p-6">
            <h2 className="text-xl font-bold mb-4">Contenedores de Scrap / Merma</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted text-muted-foreground">
                    <th className="p-3">Contenedor</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Stock Actual</th>
                    <th className="p-3">Capacidad</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map(c => (
                    <tr key={c.id} className="border-b">
                      <td className="p-3 font-bold">{c.code} - {c.name}</td>
                      <td className="p-3">{c.container_type}</td>
                      <td className="p-3 font-black text-danger">{c.current_weight || 0} {c.unit}</td>
                      <td className="p-3">{c.capacity} {c.unit}</td>
                      <td className="p-3">{c.status}</td>
                    </tr>
                  ))}
                  {containers.length === 0 && (
                    <tr><td colSpan="5" className="p-3 text-center text-muted-foreground">Sin contenedores registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
