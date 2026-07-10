import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle,
  ChevronRight,
  Fingerprint,
  LockKeyhole,
  MapPin,
  Sparkles,
} from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
} from '../../../components/tf-ui';

import { useAuthStore } from '../../../store/authStore';
import { dashboardCards } from '../constants/dashboardCards';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const getRoleTone = (roleCode) => {
  if (roleCode === 'SUPERADMIN') return 'primary';
  if (roleCode === 'ADMIN') return 'warning';
  if (roleCode === 'SUPERVISOR') return 'success';
  if (roleCode === 'EMPLOYEE') return 'neutral';
  if (roleCode === 'FINANCE') return 'success';

  return 'neutral';
};

const getToneClasses = (tone) => {
  const tones = {
    primary: {
      icon: 'bg-[rgba(31,58,95,0.10)] text-[var(--color-primary)]',
      glow: 'from-[rgba(31,58,95,0.16)] to-transparent',
    },
    success: {
      icon: 'bg-[rgba(47,133,90,0.12)] text-[var(--color-success)]',
      glow: 'from-[rgba(47,133,90,0.14)] to-transparent',
    },
    warning: {
      icon: 'bg-[rgba(183,121,31,0.14)] text-[var(--color-warning)]',
      glow: 'from-[rgba(183,121,31,0.14)] to-transparent',
    },
    neutral: {
      icon: 'bg-slate-100 text-slate-600',
      glow: 'from-slate-100 to-transparent',
    },
  };

  return tones[tone] || tones.neutral;
};

const DashboardPage = () => {
  const { user, hasPermission } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const permissionCount = user?.permissions?.length || 0;
  const visibleCards = dashboardCards.filter((card) => hasPermission(card.permission));

  const roleTone = getRoleTone(user?.role?.code);

  const MotionSection = shouldReduceMotion ? 'section' : motion.section;
  const MotionArticle = shouldReduceMotion ? 'article' : motion.article;
  const MotionDiv = shouldReduceMotion ? 'div' : motion.div;

  return (
    <MotionSection
      className="mx-auto grid max-w-6xl gap-6"
      variants={shouldReduceMotion ? undefined : containerVariants}
      initial={shouldReduceMotion ? undefined : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'show'}
    >
      <MotionArticle
        variants={shouldReduceMotion ? undefined : itemVariants}
        className={[
          'relative overflow-hidden rounded-[2.25rem] p-6 text-white',
          'bg-[linear-gradient(135deg,var(--color-primary),#2f855a)]',
          'shadow-[0_24px_70px_rgba(31,58,95,0.28)]',
          'sm:p-8 lg:p-10',
        ].join(' ')}
      >
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-sm" />

        <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-5">
            <div className="flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-black backdrop-blur-md">
              <Sparkles className="size-5" />
              <span>TraceFlow operativo</span>
            </div>

            <div className="grid gap-3">
              <h2 className="m-0 text-4xl font-black leading-none tracking-tight sm:text-5xl lg:text-6xl">
                Hola, {fullName || user?.username}
              </h2>

              <p className="m-0 max-w-3xl text-base font-semibold leading-relaxed text-white/88 sm:text-lg">
                Tu sistema está listo para operar trazabilidad con códigos QR,
                control de accesos y administración por áreas de forma segura.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <TFBadge variant="success" className="bg-white/18 text-white">
                Sistema activo
              </TFBadge>

              <TFBadge variant={roleTone} className="bg-white/18 text-white">
                {user?.role?.name || 'Sin rol'}
              </TFBadge>

              <TFBadge variant="neutral" className="bg-white/18 text-white">
                {permissionCount} permisos
              </TFBadge>
            </div>
          </div>

          <div className="grid min-h-40 rounded-[2rem] border border-white/20 bg-white/14 p-5 backdrop-blur-md sm:min-w-56">
            <div className="grid place-items-center gap-3 text-center">
              <div className="grid size-20 place-items-center rounded-[1.6rem] bg-white/18">
                <CheckCircle className="size-11" />
              </div>

              <div className="grid gap-1">
                <strong className="text-lg font-black">Acceso validado</strong>
                <span className="text-sm font-bold text-white/80">
                  JWT + permisos
                </span>
              </div>
            </div>
          </div>
        </div>
      </MotionArticle>

      <MotionDiv
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="grid gap-4 md:grid-cols-3"
      >
        <TFCard className="relative overflow-hidden">
          <TFCardContent className="grid gap-3">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(31,58,95,0.10)] text-[var(--color-primary)]">
              <LockKeyhole className="size-7" />
            </div>

            <div className="grid gap-1">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Rol actual
              </span>

              <strong className="text-2xl font-black leading-tight text-[var(--color-primary)]">
                {user?.role?.name || 'Sin rol'}
              </strong>

              <small className="font-bold text-[var(--color-muted)]">
                Controlado por permisos
              </small>
            </div>
          </TFCardContent>
        </TFCard>

        <TFCard className="relative overflow-hidden">
          <TFCardContent className="grid gap-3">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(47,133,90,0.12)] text-[var(--color-success)]">
              <MapPin className="size-7" />
            </div>

            <div className="grid gap-1">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Área asignada
              </span>

              <strong className="text-2xl font-black leading-tight text-[var(--color-primary)]">
                {user?.area?.name || 'Acceso global'}
              </strong>

              <small className="font-bold text-[var(--color-muted)]">
                {user?.area ? 'Operación por área' : 'Sin restricción de área'}
              </small>
            </div>
          </TFCardContent>
        </TFCard>

        <TFCard className="relative overflow-hidden">
          <TFCardContent className="grid gap-3">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(183,121,31,0.14)] text-[var(--color-warning)]">
              <Fingerprint className="size-7" />
            </div>

            <div className="grid gap-1">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Permisos activos
              </span>

              <strong className="text-2xl font-black leading-tight text-[var(--color-primary)]">
                {permissionCount}
              </strong>

              <small className="font-bold text-[var(--color-muted)]">
                Acciones disponibles
              </small>
            </div>
          </TFCardContent>
        </TFCard>
      </MotionDiv>

      <MotionDiv
        variants={shouldReduceMotion ? undefined : itemVariants}
        className="grid gap-4"
      >
        <div className="grid gap-1">
          <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Accesos rápidos
          </p>

          <h2 className="m-0 text-3xl font-black tracking-tight text-[var(--color-primary)]">
            ¿Qué necesitas hacer?
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            const tone = getToneClasses(card.tone);

            return (
              <motion.div
                key={card.title}
                variants={shouldReduceMotion ? undefined : itemVariants}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              >
                <NavLink to={card.path} className="block h-full no-underline">
                  <TFCard className="group relative h-full overflow-hidden">
                    <div
                      className={[
                        'pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full',
                        'bg-gradient-to-br opacity-100 transition-transform duration-300 group-hover:scale-110',
                        tone.glow,
                      ].join(' ')}
                    />

                    <TFCardContent className="relative z-10 grid min-h-52 gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={[
                            'grid size-16 shrink-0 place-items-center rounded-[1.4rem]',
                            tone.icon,
                          ].join(' ')}
                        >
                          <Icon className="size-8" />
                        </div>

                        <TFBadge variant="neutral">{card.tag}</TFBadge>
                      </div>

                      <div className="grid gap-2">
                        <h3 className="m-0 text-2xl font-black tracking-tight text-[var(--color-primary)]">
                          {card.title}
                        </h3>

                        <p className="m-0 text-base font-semibold leading-relaxed text-[var(--color-muted)]">
                          {card.description}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <TFButton
                          asChild
                          variant="ghost"
                          className="px-0 hover:bg-transparent"
                        >
                          <span className="inline-flex items-center gap-2">
                            Abrir módulo
                            <ChevronRight className="size-5" />
                          </span>
                        </TFButton>
                      </div>
                    </TFCardContent>
                  </TFCard>
                </NavLink>
              </motion.div>
            );
          })}
        </div>
      </MotionDiv>

      <MotionDiv variants={shouldReduceMotion ? undefined : itemVariants}>
        <TFCard>
          <TFCardContent className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Seguridad
                </p>

                <h2 className="m-0 text-2xl font-black text-[var(--color-primary)]">
                  Permisos activos
                </h2>
              </div>

              <TFBadge variant="primary">{permissionCount} permisos</TFBadge>
            </div>

            <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-3xl border border-[rgba(31,58,95,0.08)] bg-slate-50/70 p-4">
              {user?.permissions?.map((permission) => (
                <TFBadge variant="neutral" key={permission}>
                  {permission}
                </TFBadge>
              ))}
            </div>
          </TFCardContent>
        </TFCard>
      </MotionDiv>
    </MotionSection>
  );
};

export default DashboardPage;