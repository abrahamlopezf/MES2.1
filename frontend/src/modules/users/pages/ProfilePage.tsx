import React from 'react';
import { Card, CardContent, TopBar, Button } from '../../../design-system';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Moon, Sun, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4">
      <TopBar title="Mi Perfil" />
      
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <UserIcon size={40} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{user?.first_name} {user?.last_name}</h2>
          <p className="text-muted-foreground">{user?.username}</p>
          
          <div className="mt-6 flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={toggleTheme}
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </Button>
            
            <Button 
              variant="destructive" 
              className="w-full justify-center gap-2"
              onClick={handleLogout}
            >
              <LogOut size={20} />
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
