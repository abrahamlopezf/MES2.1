import React from 'react';
import { Card, CardContent, TopBar } from '../../../design-system';
import { Package, Layers, QrCode, Factory, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AreasPage: React.FC = () => {
  const navigate = useNavigate();

  const areas = [
    { id: 'almacen', title: 'Almacén', description: 'Recepción y Materia Prima', icon: Package, path: '/warehouse/inventory' },
    { id: 'extrusion', title: 'Extrusión', description: 'Proceso de Hilos', icon: Layers, path: '/production/extrusion' },
    { id: 'telares', title: 'Telares', description: 'Tejido de Bobinas', icon: Factory, path: '/production/machines' },
    { id: 'identity', title: 'Centro de Identidad', description: 'Gestión de QRs', icon: QrCode, path: '/identity/generate' },
    { id: 'admin', title: 'Configuración', description: 'Usuarios y Sistema', icon: Settings, path: '/users' },
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 py-4 md:py-6 overflow-x-hidden">
      <TopBar title="Áreas Operativas" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-32 sm:pb-12">
        {areas.map((area) => (
          <Card 
            key={area.id} 
            className="cursor-pointer hover:border-primary transition-all active:scale-95 group"
            onClick={() => navigate(area.path)}
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
