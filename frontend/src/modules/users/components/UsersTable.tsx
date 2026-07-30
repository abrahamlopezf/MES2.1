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
          <Card key={user.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-2 h-full ${status === 'ACTIVE' ? 'bg-success' : status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
            
            <CardContent className="p-4 pl-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-foreground text-lg leading-tight">
                    {user.nombres} {user.apellidos}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">{user.username}</p>
                </div>
                <Badge variant={isSuperadmin ? 'default' : 'secondary'}>
                  {user.rolNombre}
                </Badge>
              </div>

              <div className="bg-muted/50 rounded-xl p-3 mb-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nómina:</span>
                  <span className="font-mono font-medium text-foreground">{user.numeroNomina || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Área:</span>
                  <span className="font-medium text-foreground">{user.areaNombre || 'Global'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Badge 
                  variant={status === 'ACTIVE' ? 'success' : status === 'PENDING' ? 'warning' : 'destructive'}
                >
                  {status === 'ACTIVE' ? 'Activo' : status === 'PENDING' ? 'Pendiente' : 'Inactivo'}
                </Badge>

                <PermissionGate permission="users.update">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(user)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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
