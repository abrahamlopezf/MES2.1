import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'WAREHOUSE_OPERATOR' | 'MIXING_OPERATOR' | 'EXTRUSION_OPERATOR' | 'SUPERVISOR';

interface User {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    id: 'OP-001',
    name: 'Operador Demo',
    role: 'ADMIN' // Default for dev
  });

  const login = (role: UserRole) => {
    setUser({ id: `OP-${Math.floor(Math.random()*1000)}`, name: `Usuario ${role}`, role });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
