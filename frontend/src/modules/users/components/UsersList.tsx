import React from 'react';
import { Edit3 } from 'lucide-react';
import { Badge, Button } from '../../../design-system';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { User } from '../types/user';

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
}

const UsersList: React.FC<UsersListProps> = ({ users = [], onEdit }) => {
  return (
    <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-secondary text-secondary-foreground font-bold tracking-wider border-b border-border uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Usuario</th>
            <th className="px-6 py-4">Nómina</th>
            <th className="px-6 py-4">Rol</th>
            <th className="px-6 py-4 text-center">Estado</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => {
            const isSuperadmin = user.rolNombre.toUpperCase().includes('ADMIN');
            const status = user.status;
            
            return (
              <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground text-base leading-tight">
                      {user.nombres} {user.apellidos}
                    </span>
                    <span className="text-muted-foreground font-medium text-xs mt-0.5">
                      {user.username}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-foreground">
                  {user.numeroNomina || '-'}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={isSuperadmin ? 'default' : 'secondary'} className="font-bold">
                    {user.rolNombre}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-1.5 justify-center">
                    <span className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-success' : status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                      {status === 'ACTIVE' ? 'Activo' : status === 'PENDING' ? 'Pendiente' : 'Inactivo'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <PermissionGate permission="users.update">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(user)}
                      className="font-bold shadow-sm h-8"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-2" />
                      Editar
                    </Button>
                  </PermissionGate>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UsersList;
