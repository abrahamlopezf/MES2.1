export const queryKeys = {
  auth: {
    session: ['auth', 'session'],
  },
  users: {
    all: ['users'],
    list: (filters: Record<string, any>) => ['users', 'list', filters],
    detail: (id: string) => ['users', 'detail', id],
    permissions: (id: string) => ['users', 'permissions', id],
    roles: (id: string) => ['users', 'roles', id],
  },
  warehouse: {
    inventory: ['warehouse', 'inventory'],
  },
};
