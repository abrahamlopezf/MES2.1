import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Factory, Power, Settings2, FileSignature } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '../../../../design-system';
import { apiClient } from '../../../../core/api/apiClient';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';

export const MachinesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: machinesData, isLoading } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      // Mock data for machines based on PDF details
      return [
        { id: 1, name: 'EXTRUSORA LIQUITANK', status: 'ACTIVE', type: 'LIQUITANK', last_maintenance: '2026-09-15' },
        { id: 2, name: 'EXTRUSORA 1', status: 'ACTIVE', type: 'CINTURON', last_maintenance: '2026-09-20' },
        { id: 3, name: 'EXTRUSORA 2', status: 'ACTIVE', type: 'STANDARD', last_maintenance: '2026-08-30' },
        { id: 4, name: 'EXTRUSORA 4', status: 'ACTIVE', type: 'STANDARD', last_maintenance: '2026-09-05' },
        { id: 5, name: 'EXTRUSORA 5', status: 'MAINTENANCE', type: 'STANDARD', last_maintenance: '2026-09-29' }
      ];
    }
  });

  const machines = machinesData || [];

  const filteredMachines = machines.filter((m: any) => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Factory className="w-8 h-8 text-primary" />
            Catálogo de Extrusoras
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Gestiona las máquinas extrusoras operativas en el área.
          </p>
        </div>
        
        <PermissionGate permission="extrusion.runs.manage">
          <Button className="w-full md:w-auto gap-2">
            <Plus size={18} />
            Registrar Máquina
          </Button>
        </PermissionGate>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Buscar máquina..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-muted/50 border-transparent focus:bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 flex justify-center text-muted-foreground font-bold animate-pulse">
          Cargando máquinas...
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-dashed border-border">
          <Factory size={48} className="opacity-20 mb-4" />
          <p className="font-medium">No se encontraron extrusoras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMachines.map((machine: any) => (
            <Card key={machine.id} className="overflow-hidden hover:border-primary/50 transition-colors shadow-sm bg-card border border-border group">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg shrink-0 ${machine.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      <Settings2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-foreground leading-tight">{machine.name}</h3>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{machine.type}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${machine.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    <span className="text-sm font-bold text-foreground">
                      {machine.status === 'ACTIVE' ? 'Operativa' : 'En Mantenimiento'}
                    </span>
                  </div>
                  
                  <PermissionGate permission="extrusion.runs.manage">
                    <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      Editar
                    </Button>
                  </PermissionGate>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
