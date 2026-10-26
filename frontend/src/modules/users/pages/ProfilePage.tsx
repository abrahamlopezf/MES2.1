import React, { useState } from 'react';
import { Card, CardContent, TopBar, Button } from '../../../design-system';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import {
  Moon, Sun, LogOut, Edit2, X, Save, Lock, Camera, Link as LinkIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import api from '@/api/axiosClient';
import { UserAvatar as SharedUserAvatar } from '../../../components/ui/UserAvatar';

const ProfilePage: React.FC = () => {
  const { user, logout, initializeAuth } = useAuthStore() as any;
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarInput, setAvatarInput] = useState(user?.avatar_url || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const resetEditState = () => {
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setEmail(user?.email || '');
    setTelefono(user?.telefono || '');
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('El nombre y apellido son obligatorios');
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        telefono: telefono.trim(),
      };
      if (email.trim()) {
        payload.email = email.trim();
      }

      await api.put('/auth/profile', payload);
      
      if (initializeAuth) {
        await initializeAuth();
      }
      
      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      await api.put('/auth/profile', { avatar_url: avatarInput || null });
      if (initializeAuth) {
        await initializeAuth();
      }
      toast.success('Avatar actualizado correctamente');
      setIsEditingAvatar(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar foto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error('La nueva contraseña es obligatoria');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Contraseña actualizada correctamente');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatar = user?.avatar_url || avatarUrl;

  return (
    <div className="space-y-4">
      <TopBar title="Mi Perfil" />

      <Card>
        <CardContent className="p-6">

          {/* ── Avatar section ─────────────────────────────────────── */}
          <div className="flex flex-col items-center mb-6 gap-2">
            <div className="relative group">
              <SharedUserAvatar
                name={String(user?.id ?? user?.username ?? '')}
                label={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Usuario'}
                src={displayAvatar}
                size={104}
              />
              <button
                type="button"
                onClick={() => setIsEditingAvatar(true)}
                aria-label="Cambiar imagen de perfil"
                className="absolute inset-0 flex items-center justify-center rounded-[1.15rem] bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
                title="Cambiar foto"
              >
                <Camera size={22} className="text-white" />
              </button>
            </div>

            <h2 className="text-2xl font-bold text-foreground text-center">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-muted-foreground text-center text-sm">
              {user?.username} · {user?.role?.name}
            </p>
          </div>

          {/* ── Avatar URL editor ──────────────────────────────────── */}
          {isEditingAvatar && (
            <div className="max-w-sm mx-auto mb-6 space-y-3 bg-secondary/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <LinkIcon size={14} /> URL de foto de perfil
              </h3>
              <Input
                placeholder="https://ejemplo.com/mi-foto.jpg"
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                className="text-sm"
              />
              <div className="flex justify-center py-1">
                <SharedUserAvatar
                  name={String(user?.id ?? user?.username ?? '')}
                  label={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Usuario'}
                  src={avatarInput || null}
                  size={64}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setAvatarInput(user?.avatar_url || ''); setIsEditingAvatar(false); }}
                  disabled={isSaving}
                >
                  <X size={14} className="mr-1" /> Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSaveAvatar} disabled={isSaving}>
                  <Save size={14} className="mr-1" /> Guardar
                </Button>
              </div>
            </div>
          )}

          {/* ── Info summary (read-only) ───────────────────────────── */}
          {!isEditing && !isChangingPassword && !isEditingAvatar && (
            <div className="mt-2 flex flex-col gap-3 max-w-sm mx-auto">
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2 mb-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium text-foreground">
                    {user?.first_name} {user?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuario:</span>
                  <span className="font-mono text-foreground font-medium">{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-foreground truncate max-w-[160px]">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="font-medium text-foreground">{user?.telefono || 'N/A'}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full justify-center gap-2" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Editar Información
              </Button>

              <Button variant="outline" className="w-full justify-center gap-2" onClick={() => setIsChangingPassword(true)}>
                <Lock size={16} /> Cambiar Contraseña
              </Button>

              <Button variant="outline" className="w-full justify-between" onClick={toggleTheme}>
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
                </span>
              </Button>

              <Button variant="destructive" className="w-full justify-center gap-2" onClick={handleLogout}>
                <LogOut size={16} /> Cerrar Sesión
              </Button>
            </div>
          )}

          {/* ── Edit info form ─────────────────────────────────────── */}
          {isEditing && (
            <div className="max-w-sm mx-auto mt-2 space-y-4">
              <h3 className="text-base font-bold text-foreground border-b pb-2">Editar Información</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nombre *</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Apellido *</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  Usuario <span className="text-xs normal-case font-normal text-muted-foreground/60">(no editable)</span>
                </label>
                <Input value={user?.username || ''} disabled className="opacity-50 cursor-not-allowed" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Correo Electrónico</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Teléfono</label>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+52 000 000 0000" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={resetEditState} disabled={isSaving}>
                  <X size={14} className="mr-1" /> Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSaveProfile} disabled={isSaving}>
                  <Save size={14} className="mr-1" /> {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Change password form ───────────────────────────────── */}
          {isChangingPassword && (
            <div className="max-w-sm mx-auto mt-2 space-y-4">
              <h3 className="text-base font-bold text-foreground border-b pb-2">Cambiar Contraseña</h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Contraseña Actual</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Dejar vacío si fue restablecida"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nueva Contraseña</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setIsChangingPassword(false)} disabled={isSaving}>
                  <X size={14} className="mr-1" /> Cancelar
                </Button>
                <Button className="flex-1" onClick={handleChangePassword} disabled={isSaving}>
                  <Save size={14} className="mr-1" /> {isSaving ? 'Guardando...' : 'Cambiar'}
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
