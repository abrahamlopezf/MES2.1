import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../../store/authStore';
import { Card, CardContent, Icon } from '../../../../design-system';

export const ExtrusionDashboard = () => {
  const { user } = useAuthStore();

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            <Icon name="monitoring" size={32} className="shrink-0 text-primary" />
            Módulo de Extrusión
          </h1>
          <p className="text-base font-medium leading-relaxed text-muted-foreground">
            Hola, {user?.name || 'Usuario'}. Consulta las áreas operativas para revisar información vigente.
          </p>
        </header>

        <section aria-labelledby="dashboard-data-title" role="status" className="rounded-xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100 sm:p-6">
          <div className="flex items-start gap-3">
            <Icon name="info" size={24} className="mt-0.5 shrink-0" />
            <div className="max-w-3xl space-y-2">
              <h2 id="dashboard-data-title" className="text-lg font-black sm:text-xl">Panel ejecutivo sin datos conectados</h2>
              <p className="text-base leading-relaxed">
                Este tablero aún no recibe indicadores operativos del sistema. Para evitar decisiones basadas en cifras de ejemplo, aquí no se muestran métricas ni estados simulados.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="operations-title" className="space-y-3">
          <h2 id="operations-title" className="text-xl font-black text-foreground">Ir a operación</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="border-border shadow-sm">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 sm:p-6">
                <Icon name="view_kanban" size={28} className="text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Tablero de colas</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">Consulta y organiza los lotes asignados a las extrusoras.</p>
                </div>
                <Link to="/extrusion/board" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                  Abrir tablero
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 sm:p-6">
                <Icon name="precision_manufacturing" size={28} className="text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Extrusoras</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">Revisa disponibilidad y fórmulas compatibles.</p>
                </div>
                <Link to="/production/machines" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-border px-6 text-base font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                  Ver extrusoras
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm sm:col-span-2 xl:col-span-1">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 sm:p-6">
                <Icon name="blender" size={28} className="text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Centro de mezclado</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">Prepara mezclas y consulta etiquetas de contenedores.</p>
                </div>
                <Link to="/production/mixing" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-border px-6 text-base font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                  Abrir mezclado
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};
