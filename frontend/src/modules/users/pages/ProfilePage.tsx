import React, { useState } from 'react';
import { Card, CardContent, TopBar, Button } from '../../../design-system';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Moon, Sun, LogOut, User as UserIcon, Edit2, X, Save, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import api from '@/api/axiosClient';

const ProfilePage: React.FC = () => {
  const { user, logout, setToken } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    try {
      await api.put('/auth/profile', { email, telefono });
      // Reload user data
      const res = await api.get('/auth/me');
      setToken(localStorage.getItem('token') || '', res.data.data);
      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error('La nueva contraseña es obligatoria');
      return;
    }
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Contraseña actualizada correctamente');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  };

  return (
    <div className="space-y-4">
      <TopBar title="Mi Perfil" />
      
      <Card>
        <CardContent className="p-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <UserIcon size={40} />
          </div>
          <h2 className="text-2xl font-bold text-foreground text-center">{user?.first_name} {user?.last_name}</h2>
          <p className="text-muted-foreground text-center mb-6">{user?.username} - {user?.role?.name}</p>
          
          {!isEditing && !isChangingPassword && (
            <div className="mt-6 flex flex-col gap-3 max-w-sm mx-auto">
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-foreground">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="font-medium text-foreground">{user?.telefono || 'N/A'}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full justify-center gap-2" onClick={() => setIsEditing(true)}>
                <Edit2 size={20} /> Editar Información
              </Button>

              <Button variant="outline" className="w-full justify-center gap-2" onClick={() => setIsChangingPassword(true)}>
                <Lock size={20} /> Cambiar Contraseña
              </Button>

              <Button variant="outline" className="w-full justify-between" onClick={toggleTheme}>
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
                </span>
              </Button>
              
              <Button variant="destructive" className="w-full justify-center gap-2" onClick={handleLogout}>
                <LogOut size={20} /> Cerrar Sesión
              </Button>
            </div>
          )}

          {isEditing && (
            <div className="max-w-sm mx-auto mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Editar Información</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Correo Electrónico</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teléfono</label>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  <X size={16} className="mr-2" /> Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSaveProfile}>
                  <Save size={16} className="mr-2" /> Guardar
                </Button>
              </div>
            </div>
          )}

          {isChangingPassword && (
            <div className="max-w-sm mx-auto mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Cambiar Contraseña</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Contraseña Actual</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Dejar vacío si fue restablecida" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nueva Contraseña</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsChangingPassword(false)}>
                  <X size={16} className="mr-2" /> Cancelar
                </Button>
                <Button className="flex-1" onClick={handleChangePassword}>
                  <Save size={16} className="mr-2" /> Cambiar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
