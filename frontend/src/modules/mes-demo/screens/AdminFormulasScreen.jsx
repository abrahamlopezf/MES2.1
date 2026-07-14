import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import { Boxes, Plus, Trash2, Loader2 } from "lucide-react";

export default function AdminFormulasScreen() {
  const [formulas, setFormulas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [targetArea, setTargetArea] = useState("");
  const [items, setItems] = useState([{ material_id: "", material_role: "BASE", quantity: "", unit: "KG" }]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [formulasRes, areasRes, matsRes] = await Promise.all([
        axiosClient.get("/formulas"),
        axiosClient.get("/areas"),
        axiosClient.get("/materials")
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
      setMaterials(extractArray(matsRes));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => setItems([...items, { material_id: "", material_role: "ADDITIVE", quantity: "", unit: "KG" }]);
  const handleRemoveItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleItemChange = (idx, field, value) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        code,
        name,
        target_area_id: parseInt(targetArea, 10),
        items: items.map(item => ({
          material_id: parseInt(item.material_id, 10),
          material_role: item.material_role,
          calculation_type: "FIXED_QUANTITY",
          quantity: parseFloat(item.quantity),
          unit: item.unit
        }))
      };

      await axiosClient.post("/formulas", payload);
      
      setCode("");
      setName("");
      setItems([{ material_id: "", material_role: "BASE", quantity: "", unit: "KG" }]);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.friendlyMessage || "Error al crear la fórmula. Verifique los datos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Boxes size={32} /> Administrar Fórmulas
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl shadow border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Nueva Fórmula</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1">Código (Ej. FORM-01)</label>
              <input required type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full p-2 border rounded bg-background uppercase" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Nombre</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded bg-background" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Área Destino</label>
              <select required value={targetArea} onChange={e => setTargetArea(e.target.value)} className="w-full p-2 border rounded bg-background">
                <option value="">Seleccione área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold">Ingredientes</label>
              <button type="button" onClick={handleAddItem} className="text-xs flex items-center gap-1 font-bold text-primary"><Plus size={14} /> Agregar</button>
            </div>
            
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <select required value={item.material_id} onChange={e => handleItemChange(idx, "material_id", e.target.value)} className="w-full p-2 border rounded bg-background text-sm">
                    <option value="">Material...</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <select required value={item.material_role} onChange={e => handleItemChange(idx, "material_role", e.target.value)} className="w-full p-2 border rounded bg-background text-sm">
                    <option value="BASE">BASE</option>
                    <option value="ADDITIVE">ADITIVO</option>
                    <option value="PIGMENT">PIGMENTO</option>
                    <option value="SECONDARY">SECUNDARIO</option>
                    <option value="RECYCLED">RECICLADO</option>
                  </select>
                </div>
                <div className="w-20">
                  <input required type="number" step="0.01" min="0.01" value={item.quantity} onChange={e => handleItemChange(idx, "quantity", e.target.value)} placeholder="Cant" className="w-full p-2 border rounded bg-background text-sm" />
                </div>
                <div className="w-16">
                  <input required type="text" value={item.unit} onChange={e => handleItemChange(idx, "unit", e.target.value.toUpperCase())} className="w-full p-2 border rounded bg-background text-sm uppercase" />
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="p-2 text-danger hover:bg-danger/10 rounded">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <div className="text-danger text-sm font-bold mb-4">{error}</div>}

          <button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground font-bold p-2 rounded disabled:opacity-50 hover:bg-primary/90 transition-colors">
            {isLoading ? "Guardando..." : "Crear Fórmula"}
          </button>
        </form>

        <div className="bg-surface rounded-xl shadow border border-border p-6 overflow-hidden flex flex-col h-full max-h-[80vh]">
          <h2 className="text-xl font-bold mb-4">Catálogo de Fórmulas</h2>
          {loading ? (
             <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Cargando...</div>
          ) : (
            <div className="overflow-y-auto flex-1 pr-2">
              {formulas.map(f => (
                <div key={f.id} className="p-4 border border-border rounded-lg mb-3 bg-muted/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-black text-lg text-primary">{f.code}</h3>
                      <p className="font-bold">{f.name}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">{f.target_area?.name}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Ingredientes:</p>
                    <ul className="text-sm space-y-1">
                      {f.items?.map(i => (
                        <li key={i.id} className="flex justify-between border-b border-border/50 pb-1">
                          <span>{i.material?.name || `Material ${i.material_id}`} <span className="text-xs text-muted-foreground">({i.material_role})</span></span>
                          <span className="font-bold">{i.quantity} {i.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
              {formulas.length === 0 && <p className="text-muted-foreground">No hay fórmulas registradas.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
