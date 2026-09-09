import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
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
  const [isRendered, setIsRendered] = useState(false);

  // Solamente si el usuario está logueado y must_change_password es true
  const isOpen = user && user.must_change_password === true;

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 400); 
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

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
    <div 
      className={`fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        aria-hidden="true"
      />

      <div
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* No drag handle because it's a forced action */}

        {/* Header */}
        <div className="px-5 py-5 border-b border-border bg-card">
          <h2 className="text-xl font-bold text-warning flex items-center gap-2">
            <Lock size={24} className="text-warning" /> 
            Cambio de contraseña requerido
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Por políticas de seguridad o porque tu cuenta fue restablecida, debes cambiar tu contraseña para poder continuar usando el sistema.
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6 bg-background flex flex-col">
          <form id="forcePasswordForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Contraseña Actual / Temporal</label>
              <Input 
                type="password" 
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa la contraseña con la que iniciaste sesión" 
                autoComplete="current-password"
                className="h-14 rounded-xl text-lg px-4 bg-card shadow-inner border-border focus-visible:ring-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Nueva Contraseña</label>
              <Input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" 
                autoComplete="new-password"
                className="h-14 rounded-xl text-lg px-4 bg-card shadow-inner border-border focus-visible:ring-primary"
                required
              />
            </div>
          </form>
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <Button 
            type="submit" 
            form="forcePasswordForm"
            disabled={isLoading}
            className="w-full font-bold py-6 rounded-xl shadow-md h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </Button>
        </div>
      </div>
    </div>
  );
};
