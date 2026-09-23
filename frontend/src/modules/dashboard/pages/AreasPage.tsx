import React, { useState } from 'react';
import { Package, Layers, QrCode, Factory, Users, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

export const AreasPage: React.FC = () => {
  const navigate = useNavigate();
  const { group } = useParams();
  const { hasPermission } = useAuthStore();

  const allAreas = [
    { 
      id: 'almacen', 
      title: 'Almacén', 
      description: 'Recepción e Inventario', 
      icon: Package,
      gradient: 'from-blue-500/20 to-indigo-500/20 text-blue-500',
      children: [
        { id: 'catalogo', title: 'Catálogo de Materiales', description: 'Materiales y Fórmulas', icon: Package, path: '/materials', permission: 'materials.read' },
        { id: 'recepcion', title: 'Recepción', description: 'Materia Prima', icon: Package, onClick: () => window.dispatchEvent(new Event('open-scanner')), permission: 'inventory.receive' },
        { id: 'inventario', title: 'Inventario', description: 'Almacén (MES 3.0)', icon: Layers, path: '/warehouse/inventory', permission: 'inventory.view' },
        { id: 'merma_scrap', title: 'Control Merma/Scrap', description: 'Registro de Bajas', icon: Package, path: '/warehouse/merma-scrap', permission: 'warehouse.merma_scrap.view' },
        { id: 'ordenes_consumo', title: 'Órdenes de Consumo', description: 'Solicitudes y Surtido', icon: Package, path: '/warehouse/orders', permission: 'warehouse.orders.create' },
      ]
    },
    { 
      id: 'identity', 
      title: 'Centro de Identidad', 
      description: 'Gestión de QRs', 
      icon: QrCode,
      gradient: 'from-purple-500/20 to-fuchsia-500/20 text-purple-500',
      children: [
        { id: 'identity_gen', title: 'Generar Lote QR', description: 'Impresión de QRs', icon: QrCode, path: '/identity/generate', permission: 'qr.create' },
        { id: 'identity_hist', title: 'Historial QRs', description: 'Trazabilidad', icon: QrCode, path: '/qrcodes', permission: 'qr.history.read' },
      ]
    },
    { 
      id: 'admin', 
      title: 'Gestor de Usuarios', 
      description: 'Cuentas, Roles y Permisos', 
      icon: Users, 
      path: '/users',
      permission: 'users.read',
      gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-500',
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
    if (item.onClick) {
      item.onClick();
    } else if (item.children && item.children.length > 0) {
      navigate(`/areas/${item.id}`);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const selectedGroup = areas.find(a => a.id === group);
  const currentList = selectedGroup ? selectedGroup.children : areas;

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 pt-6 pb-32 sm:pb-12 overflow-x-hidden min-h-screen bg-background">
      
      {/* Header Premium */}
      <div className="relative mb-8">
        <div className="flex items-center gap-4 relative z-10">

          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {selectedGroup ? selectedGroup.title : "Áreas Operativas"}
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {selectedGroup ? "Selecciona un módulo para continuar" : "Acceso rápido a los módulos del sistema"}
            </p>
          </div>
        </div>
        {/* Subtle background glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      </div>

      {/* Grid de Cards Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 relative z-10">
        {currentList.map((area: any, idx: number) => {
          const itemGradient = area.gradient || 'from-primary/20 to-primary/10 text-primary';
          
          return (
            <div 
              key={area.id} 
              className="group cursor-pointer rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 overflow-hidden relative"
              onClick={() => handleCardClick(area)}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              
              <div className="p-6 relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${itemGradient} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-400 ease-out`}>
                    <area.icon size={30} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-xl text-foreground tracking-tight">{area.title}</h3>
                    <p className="text-sm font-medium text-muted-foreground/80 mt-0.5">{area.description}</p>
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400 ease-out">
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

