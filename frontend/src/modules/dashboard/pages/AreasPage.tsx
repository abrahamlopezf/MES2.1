import React, { useState } from 'react';
import { Card, CardContent, TopBar } from '../../../design-system';
import { Package, Layers, QrCode, Factory, Settings, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AreasPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const areas = [
    { 
      id: 'almacen', 
      title: 'Almacén', 
      description: 'Recepción e Inventario', 
      icon: Package,
      children: [
        { id: 'catalogo', title: 'Catálogo de Materiales', description: 'Materiales y Fórmulas', icon: Package, path: '/materials' },
        { id: 'recepcion', title: 'Recepción', description: 'Materia Prima', icon: Package, path: '/warehouse/receive' },
        { id: 'inventario', title: 'Inventario', description: 'Almacén (MES 3.0)', icon: Layers, path: '/warehouse/inventory' },
      ]
    },
    { 
      id: 'identity', 
      title: 'Centro de Identidad', 
      description: 'Gestión de QRs', 
      icon: QrCode,
      children: [
        { id: 'identity_gen', title: 'Generar Lote QR', description: 'Impresión de QRs', icon: QrCode, path: '/identity/generate' },
        { id: 'identity_hist', title: 'Historial QRs', description: 'Trazabilidad', icon: QrCode, path: '/qrcodes' },
      ]
    },
    { 
      id: 'admin', 
      title: 'Configuración', 
      description: 'Usuarios y Sistema', 
      icon: Settings, 
      path: '/users' 
    },
  ];

  const handleCardClick = (item: any) => {
    if (item.children) {
      setSelectedGroup(item);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const currentList = selectedGroup ? selectedGroup.children : areas;

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 py-4 md:py-6 overflow-x-hidden">
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
