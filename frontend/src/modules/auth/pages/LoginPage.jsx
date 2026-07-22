import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, LogIn, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  identifier: z.string().min(1, 'El usuario o número de nómina es obligatorio.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (credentials) => login(credentials),
    onSuccess: () => {
      navigate('/dashboard', { replace: true });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      form.setFocus('identifier');
    }
  }, [isAuthenticated, form.setFocus, form]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-3 items-center text-center pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acceso al sistema</CardTitle>
          <CardDescription className="text-base">
            Ingresa tu usuario y contraseña para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mutation.isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {mutation.error?.message || 'No pudimos iniciar sesión.'}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario o No. de Nómina</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="Ingresa tu usuario o número de nómina"
                          autoComplete="username"
                          disabled={mutation.isPending}
                          className="!pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Escribe tu contraseña"
                          autoComplete="current-password"
                          disabled={mutation.isPending}
                          className="!pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 text-base font-semibold mt-2" disabled={mutation.isPending}>
                <LogIn className={`mr-2 h-5 w-5 ${mutation.isPending ? 'animate-pulse' : ''}`} />
                {mutation.isPending ? 'Validando...' : 'Ingresar al sistema'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
};

export default LoginPage;