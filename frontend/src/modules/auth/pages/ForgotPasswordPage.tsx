import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/api/axiosClient';

const requestSchema = z.object({
  identifier: z.string().min(1, 'El usuario o nómina es obligatorio.'),
});

const resetSchema = z.object({
  code: z.string().length(6, 'El código debe ser de 6 dígitos.'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestForm = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { identifier: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '' },
  });

  const onRequestSubmit = async (data: { identifier: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { identifier: data.identifier });
      setIdentifier(data.identifier);
      toast.success('Código enviado. Revisa tu correo o celular (consola).');
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al solicitar recuperación');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: { code: string; newPassword: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { 
        identifier, 
        code: data.code, 
        newPassword: data.newPassword 
      });
      toast.success('Contraseña restablecida con éxito. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al restablecer contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-3 items-center text-center pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            {step === 1 ? <Mail className="w-8 h-8 text-primary" /> : <ShieldCheck className="w-8 h-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {step === 1 ? 'Recuperar Contraseña' : 'Ingresa tu Código'}
          </CardTitle>
          <CardDescription className="text-base">
            {step === 1 
              ? 'Ingresa tu usuario, correo o nómina para enviarte un código de recuperación.'
              : 'Ingresa el código de 6 dígitos que enviamos y tu nueva contraseña.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-5">
                <FormField
                  control={requestForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario o Nómina</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. jperez" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar Código'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5">
                <FormField
                  control={resetForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Recuperación</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="123456" disabled={isLoading} className="pl-10 text-center tracking-widest font-mono text-lg" maxLength={6} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input type="password" placeholder="Mínimo 8 caracteres" disabled={isLoading} className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Procesando...' : 'Restablecer Contraseña'}
                  <ShieldCheck className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate('/login')} className="text-sm">
              Volver al inicio de sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
