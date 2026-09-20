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
  
  const searchParams = new URLSearchParams(window.location.search);
  const reason = searchParams.get('reason');

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
        {reason === 'multidevice' && (
          <div className="p-4 bg-danger/10 text-danger border-b border-danger/20 text-sm font-medium text-center">
            Se ha cerrado tu sesión porque iniciaste sesión en otro dispositivo.
          </div>
        )}
        {reason === 'timeout' && (
          <div className="p-4 bg-warning/10 text-warning-foreground border-b border-warning/20 text-sm font-medium text-center">
            Por seguridad, tu sesión se ha cerrado automáticamente tras 12 horas de actividad.
          </div>
        )}
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
                  <FormItem style={{ '--stagger': 1 }}>
                    <FormLabel>Usuario o No. de Nómina</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
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
                  <FormItem style={{ '--stagger': 2 }}>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
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

              <Button 
                type="submit" 
                className="w-full text-base font-semibold mt-6 animate-form-field" 
                style={{ '--stagger': 3 }}
                disabled={mutation.isPending}
              >
                <LogIn className={`mr-2 h-5 w-5 ${mutation.isPending ? 'animate-pulse' : ''}`} />
                {mutation.isPending ? 'Validando...' : 'Ingresar al sistema'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => navigate('/forgot-password')} className="text-sm text-muted-foreground hover:text-primary">
              ¿Olvidaste tu contraseña?
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default LoginPage;