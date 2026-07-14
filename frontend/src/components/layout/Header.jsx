import { Menu, Search, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const Header = ({ onMenuToggle }) => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const roleName = user?.role?.name || 'TraceFlow User';
  const userName = user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username;
  const initials = userName?.slice(0, 2).toUpperCase() || 'TF';

  return (
    <header className="h-20 shrink-0 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 z-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-foreground hover:bg-border/50 transition-colors focus:outline-none lg:hidden"
        >
          <Menu size={24} />
        </button>
        
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-foreground focus-within:border-primary transition-all shadow-sm">
          <Search size={18} className="text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar Lote, QR o Material..." 
            className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md border border-border text-foreground hover:bg-border/50 transition-colors focus:outline-none shadow-sm"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-3 p-1 pr-4 rounded-full border border-border bg-background shadow-sm">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-inner">
            {initials}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-bold text-text leading-tight" style={{ color: 'var(--color-text)' }}>{userName}</span>
            <span className="text-xs font-semibold text-muted" style={{ color: 'var(--color-muted)' }}>{roleName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;