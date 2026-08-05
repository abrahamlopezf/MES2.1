import React from 'react';
import { Edit3 } from 'lucide-react';

import { Card, CardContent, Badge, Button } from '../../../design-system';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { User } from '../types/user';

interface UsersGridProps {
  users: User[];
  onEdit: (user: User) => void;
}

const UsersGrid: React.FC<UsersGridProps> = ({ users = [], onEdit }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((user) => {
        const isSuperadmin = user.rolNombre.toUpperCase().includes('ADMIN');
        const status = user.status;
        
        return (
          <Card key={user.id} className="relative group hover:border-primary/50 transition-colors bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-black text-foreground text-xl leading-none tracking-tight">
                    {user.nombres} {user.apellidos}
                  </h3>
                  <p className="text-sm text-muted-foreground font-semibold">{user.username}</p>
                </div>
                <Badge variant={isSuperadmin ? 'default' : 'secondary'} className="font-bold">
                  {user.rolNombre}
                </Badge>
              </div>

              <div className="bg-surface rounded-lg p-4 mb-5 space-y-2 border border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Nómina</span>
                  <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border shadow-sm">
                    {user.numeroNomina || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Área</span>
                  <span className="font-bold text-foreground">
                    {user.areaNombre || 'Global'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-success' : status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
                  <span className="text-sm font-bold text-foreground">
                    {status === 'ACTIVE' ? 'Activo' : status === 'PENDING' ? 'Pendiente' : 'Inactivo'}
                  </span>
                </div>

                <PermissionGate permission="users.update">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(user)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity font-bold shadow-sm"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </PermissionGate>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UsersGrid;
