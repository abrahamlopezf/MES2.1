import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import { Plus } from "lucide-react";

export default function AdminRollsScreen() {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    material_family: "TELA",
    presentation: "ROLLO",
    primary_unit: "ROLLO",
    secondary_unit: "M",
    production_area_id: 3, // Telares
  });

  const fetchItems = async () => {
    try {
      const response = await axiosClient.get("/intermediate/materials");
      const extractArray = (res) => {
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
        if (Array.isArray(res.data?.message)) return res.data.message;
        if (Array.isArray(res.data?.message?.items)) return res.data.message.items;
        if (Array.isArray(res.data)) return res.data;
        return [];
      };
      setItems(extractArray(response).filter((i) => i.presentation === "ROLLO"));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post("/intermediate/materials", formData);
      fetchItems();
      setFormData({ ...formData, code: "", name: "" });
    } catch (error) {
      console.error(error);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = items.filter(i => 
    i.code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administración: Tipos de Rollos</h1>
      
      <div className="mb-4">
        <input 
          placeholder="Buscar..." 
          className="border p-2 rounded w-full max-w-sm" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-surface p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <input placeholder="Código" required className="border p-2 rounded" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
        <input placeholder="Nombre" required className="border p-2 rounded" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2">
          <Plus size={16} /> Crear
        </button>
      </form>
      <table className="w-full text-left bg-surface shadow rounded">
        <thead>
          <tr className="border-b bg-muted text-muted-foreground">
            <th className="p-3">Código</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-3">{item.code}</td>
              <td className="p-3">{item.name}</td>
              <td className="p-3 flex gap-2">
                <button className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded" onClick={() => alert("Función Editar en desarrollo")}>Editar</button>
                <button className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded" onClick={() => alert("Función Desactivar en desarrollo")}>Desactivar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
