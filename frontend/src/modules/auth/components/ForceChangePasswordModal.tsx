import React, { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/axiosClient';

export const ForceChangePasswordModal = () => {
  const { user, initializeAuth } = useAuthStore() as any;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Solamente si el usuario está logueado y must_change_password es true
  const isOpen = user && user.must_change_password === true;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    setIsLoading(true);
    try {
      if (!currentPassword) {
        toast.error('La contraseña actual es obligatoria');
        setIsLoading(false);
        return;
      }

      await api.post('/auth/change-password', { currentPassword, newPassword });
      
      // Update local state to hide modal
      if (initializeAuth) {
        await initializeAuth();
      }
      
      toast.success('Contraseña actualizada correctamente. ¡Bienvenido!');
    } catch (error: any) {
      const detailMsg = error.response?.data?.errors?.[0]?.message;
      toast.error(detailMsg ? `Error: ${detailMsg}` : error.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      {/* onOpenChange con función vacía para evitar que se cierre al clickear fuera o presionar escape */}
      <DialogContent className="sm:max-w-md [&>button]:hidden"> 
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-warning" />
            Cambio de contraseña requerido
          </DialogTitle>
          <DialogDescription>
            Por políticas de seguridad o porque tu cuenta fue restablecida, debes cambiar tu contraseña para poder continuar usando el sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña Actual / Temporal</label>
            <Input 
              type="password" 
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa la contraseña con la que iniciaste sesión" 
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nueva Contraseña</label>
            <Input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" 
              autoComplete="new-password"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Actualizar Contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
