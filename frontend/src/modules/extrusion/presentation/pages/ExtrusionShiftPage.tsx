import React from 'react';
import { CalendarClock, CheckCircle2, ClipboardList } from '@/design-system/components/Icon/googleIconCompat';
import { ExtrusionShiftSessionPanel } from '../presenters/ExtrusionShiftSessionPanel';

const steps = [
  { icon: CalendarClock, title: 'Revisa el turno', detail: 'Confirma si iniciarás la jornada o recibirás un relevo.' },
  { icon: CheckCircle2, title: 'Confirma la continuidad', detail: 'Si hay mezclas en proceso, verifica sus QR antes de tomar el turno.' },
  { icon: ClipboardList, title: 'Opera y cierra', detail: 'Registra la producción durante el turno y captura el cierre al terminar.' },
];

export const ExtrusionShiftPage: React.FC = () => (
  <main className="mx-auto w-full max-w-[1200px] space-y-6 p-4 pb-24 md:p-6 lg:p-8">
    <header className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Turno de Extrusión</h1>
      <p className="mt-2 max-w-3xl text-base text-muted-foreground">
        Aquí confirmas quién está a cargo. Sigue los pasos que aparecen según el estado actual; no necesitas iniciar un turno cada vez que vuelves a entrar al sistema.
      </p>
    </header>

    <ol aria-label="Pasos del turno" className="grid gap-3 md:grid-cols-3">
      {steps.map(({ icon: StepIcon, title, detail }, index) => (
        <li key={title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <StepIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold"><span className="mr-1 text-muted-foreground">{index + 1}.</span>{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </div>
        </li>
      ))}
    </ol>

    <ExtrusionShiftSessionPanel />
  </main>
);

export default ExtrusionShiftPage;
