import React from 'react';
import { useAuth, UserRole } from './AuthContext';

export const RoleSwitcher: React.FC = () => {
  const { user, login } = useAuth();

  if (!user) return null;

  const roles: UserRole[] = ['ADMIN', 'WAREHOUSE_OPERATOR', 'MIXING_OPERATOR', 'EXTRUSION_OPERATOR', 'SUPERVISOR'];

  return (
    <div className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
      <div className="font-bold text-slate-800 mb-2">Simulador de Rol Activo:</div>
      <div className="flex flex-col gap-1">
        {roles.map(r => (
          <button
            key={r}
            onClick={() => login(r)}
            className={`text-left px-2 py-1.5 rounded-md transition-colors ${user.role === r ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
};
