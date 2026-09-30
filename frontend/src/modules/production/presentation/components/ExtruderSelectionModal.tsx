import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Factory, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '../../../../design-system';
import { useAuthStore } from '../../../../store/authStore';

const SESSION_KEY = 'extrusion_machine_session';
const NINE_HOURS_MS = 9 * 60 * 60 * 1000;

export const ExtruderSelectionModal = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);

  // Conditions for showing the modal:
  // 1. User belongs to Extrusion area
  // 2. User is NOT an Admin (ADMIN_EXT, ADMIN_GRAL, SUPERADMIN)
  const isExtrusionUser = user?.area?.code === 'EXTRUSION' || user?.area?.name === 'EXTRUSIÓN';
  const isAdmin = user?.role?.code === 'ADMIN_EXT' || user?.role?.code === 'ADMIN_GRAL' || user?.role?.code === 'SUPERADMIN';
  
  useEffect(() => {
    if (!isExtrusionUser || isAdmin) return;

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        const elapsed = Date.now() - parsed.timestamp;
        if (elapsed > NINE_HOURS_MS) {
          setIsOpen(true);
        }
      } catch (e) {
        setIsOpen(true);
      }
    } else {
      setIsOpen(true);
    }
  }, [isExtrusionUser, isAdmin]);

  const { data: machinesData, isLoading } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      // Mock data matching our MachinesPage
      return [
        { id: 1, name: 'EXTRUSORA LIQUITANK', status: 'ACTIVE', type: 'LIQUITANK' },
        { id: 2, name: 'EXTRUSORA 1', status: 'ACTIVE', type: 'CINTURON' },
        { id: 3, name: 'EXTRUSORA 2', status: 'ACTIVE', type: 'STANDARD' },
        { id: 4, name: 'EXTRUSORA 4', status: 'ACTIVE', type: 'STANDARD' },
        { id: 5, name: 'EXTRUSORA 5', status: 'MAINTENANCE', type: 'STANDARD' }
      ];
    },
    enabled: isOpen
  });

  const handleConfirm = () => {
    if (!selectedMachineId) return;
    
    const machine = machinesData?.find((m: any) => m.id === selectedMachineId);
    
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      machineId: selectedMachineId,
      machineName: machine?.name,
      timestamp: Date.now()
    }));
    
    setIsOpen(false);
    
    // Optionally reload or trigger an event to update context
    window.dispatchEvent(new Event('extruder-session-updated'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-primary/5 border-b border-border text-center">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <Factory size={32} />
          </div>
          <h2 className="text-2xl font-black text-foreground">Inicio de Turno</h2>
          <p className="text-muted-foreground mt-2">
            Por favor, selecciona en qué máquina extrusora estarás operando durante este turno.
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 flex justify-center text-muted-foreground font-bold animate-pulse">
              Cargando máquinas disponibles...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {machinesData?.filter((m: any) => m.status === 'ACTIVE').map((machine: any) => (
                <button
                  key={machine.id}
                  onClick={() => setSelectedMachineId(machine.id)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    selectedMachineId === machine.id 
                      ? 'border-primary bg-primary/5 ring-4 ring-primary/20' 
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <h3 className={`font-bold ${selectedMachineId === machine.id ? 'text-primary' : 'text-foreground'}`}>
                    {machine.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{machine.type}</p>
                  
                  {selectedMachineId === machine.id && (
                    <CheckCircle2 className="absolute top-4 right-4 text-primary" size={20} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-border bg-muted/20">
          <Button 
            className="w-full text-lg h-14" 
            disabled={!selectedMachineId}
            onClick={handleConfirm}
          >
            Confirmar Estación
          </Button>
        </div>
      </div>
    </div>
  );
};
