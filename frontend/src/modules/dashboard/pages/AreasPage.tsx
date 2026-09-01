import React, { useState } from 'react';
import { Card, CardContent, TopBar } from '../../../design-system';
import { Package, Layers, QrCode, Factory, Settings, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

export const AreasPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const allAreas = [
    { 
      id: 'almacen', 
      title: 'Almacén', 
      description: 'Recepción e Inventario', 
      icon: Package,
      children: [
        { id: 'catalogo', title: 'Catálogo de Materiales', description: 'Materiales y Fórmulas', icon: Package, path: '/materials', permission: 'materials.read' },
        { id: 'recepcion', title: 'Recepción', description: 'Materia Prima', icon: Package, path: '/warehouse/receive', permission: 'inventory.receive' },
        { id: 'inventario', title: 'Inventario', description: 'Almacén (MES 3.0)', icon: Layers, path: '/warehouse/inventory', permission: 'inventory.view' },
        { id: 'merma_scrap', title: 'Control Merma/Scrap', description: 'Registro de Bajas', icon: Package, path: '/warehouse/merma-scrap', permission: 'warehouse.merma_scrap.view' },
      ]
    },
    { 
      id: 'identity', 
      title: 'Centro de Identidad', 
      description: 'Gestión de QRs', 
      icon: QrCode,
      children: [
        { id: 'identity_gen', title: 'Generar Lote QR', description: 'Impresión de QRs', icon: QrCode, path: '/identity/generate', permission: 'qr.create' },
        { id: 'identity_hist', title: 'Historial QRs', description: 'Trazabilidad', icon: QrCode, path: '/qrcodes', permission: 'qr.events.read' },
      ]
    },
    { 
      id: 'admin', 
      title: 'Configuración', 
      description: 'Usuarios y Sistema', 
      icon: Settings, 
      path: '/users',
      permission: 'users.read'
    },
  ];

  // Filtrar áreas y sus hijos por permisos
  const areas = allAreas.map(area => {
    if (area.children) {
      const filteredChildren = area.children.filter(child => hasPermission(child.permission));
      return { ...area, children: filteredChildren };
    }
    return area;
  }).filter(area => {
    if (area.children) return area.children.length > 0;
    return area.permission ? hasPermission(area.permission) : true;
  });

  const handleCardClick = (item: any) => {
    if (item.children && item.children.length > 0) {
      setSelectedGroup(item);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const currentList = selectedGroup ? selectedGroup.children : areas;

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 pt-2 pb-4 md:pb-6 overflow-x-hidden">
      <div className="flex items-center gap-4">
        {selectedGroup && (
          <button 
            onClick={() => setSelectedGroup(null)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <TopBar title={selectedGroup ? selectedGroup.title : "Áreas Operativas"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-32 sm:pb-12">
        {currentList.map((area: any) => (
          <Card 
            key={area.id} 
            className="cursor-pointer hover:border-primary transition-all active:scale-95 group"
            onClick={() => handleCardClick(area)}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <area.icon size={28} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{area.title}</h3>
                <p className="text-sm text-muted-foreground">{area.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
