import { Menu, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const pageTitles = {
  '/dashboard': 'Panel principal',
  '/qr': 'Códigos QR',
  '/users': 'Usuarios',
  '/roles': 'Roles',
  '/areas': 'Áreas',
  '/materials': 'Materiales',
  '/reports': 'Reportes',
};

const Header = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const pageTitle = pageTitles[location.pathname] || 'Sistema';

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={onOpenSidebar}
          aria-label="Abrir menú completo"
        >
          <Menu size={30} />
        </button>

        <div className="header-title-block">
          <p className="eyebrow">TraceFlow</p>
          <h1>{pageTitle}</h1>
          <span className="mobile-user-greeting">
            {fullName || user?.username}
          </span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-status-pill">
          <Sparkles size={22} />
          <span>Sistema activo</span>
        </div>

        <div className="header-user-pill">
          <strong>{user?.role?.name}</strong>
          <span>{user?.username}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;