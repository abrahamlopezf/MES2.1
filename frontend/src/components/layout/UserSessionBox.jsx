import { LogOut, UserRound } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const UserSessionBox = () => {
  const { user, logout } = useAuthStore();

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

  return (
    <section className="user-session-box">
      <div className="user-session-avatar">
        <UserRound size={28} />
      </div>

      <div className="user-session-info">
        <strong>{fullName || user?.username}</strong>
        <span>{user?.role?.name}</span>
        {user?.area && <small>{user.area.name}</small>}
      </div>

      <button
        type="button"
        className="logout-button"
        onClick={logout}
        aria-label="Cerrar sesión"
      >
        <LogOut size={24} />
      </button>
    </section>
  );
};

export default UserSessionBox;