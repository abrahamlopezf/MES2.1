import React from 'react';
import { Edit3 } from 'lucide-react';
import { Badge, Button } from '../../../design-system';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { User } from '../types/user';

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
}

const UsersList: React.FC<UsersListProps> = ({ users = [], onEdit }) => {
  return (
    <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl overflow-x-auto">
      <div className="md:hidden divide-y divide-border">
        {users.map((user) => {
          const status = user.status;
          const statusLabel = status === 'ACTIVE' ? 'Activo' : status === 'PENDING' ? 'Pendiente' : 'Inactivo';

          return (
            <article key={user.id} className="p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    name={user.id || user.username}
                    label={`${user.nombres} ${user.apellidos}`.trim() || user.username}
                    src={user.avatarUrl}
                    size={44}
                  />
                  <div className="min-w-0">
                    <h3 className="text-base leading-snug font-bold text-foreground break-words">
                      {user.nombres} {user.apellidos}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1 break-all">{user.username}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 shrink-0 pt-0.5">
                  <span aria-hidden="true" className={`size-2.5 rounded-full ${status === 'ACTIVE' ? 'bg-success' : status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
                  <span className="text-sm font-bold text-foreground">{statusLabel}</span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Nómina</dt>
                  <dd className="font-bold text-foreground mt-0.5">{user.numeroNomina || 'Sin nómina'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground mb-1">Rol</dt>
                  <dd>
                    <Badge variant={user.rolNombre.toUpperCase().includes('ADMIN') ? 'default' : 'secondary'} className="font-bold">
                      {user.rolNombre}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <PermissionGate permission="users.update">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(user)}
                  aria-label={`Editar usuario ${user.nombres} ${user.apellidos}`}
                  className="font-bold shadow-sm h-12 w-full"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar usuario
                </Button>
              </PermissionGate>
            </article>
          );
        })}
      </div>

      <table className="hidden md:table w-full text-sm text-left">
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
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user.id || user.username}
                      label={`${user.nombres} ${user.apellidos}`.trim() || user.username}
                      src={user.avatarUrl}
                      size={38}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-bold text-foreground text-base leading-tight">
                        {user.nombres} {user.apellidos}
                      </span>
                      <span className="text-muted-foreground font-medium text-xs mt-0.5">
                        {user.username}
                      </span>
                    </div>
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
