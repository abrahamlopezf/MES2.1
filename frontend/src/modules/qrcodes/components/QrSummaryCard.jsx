import { motion, useReducedMotion } from 'motion/react';

import { cn } from '../../../lib/utils';

const QrSummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'primary',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const toneClasses = {
    primary: 'bg-[rgba(31,58,95,0.10)] text-[var(--color-primary)]',
    success: 'bg-[rgba(47,133,90,0.12)] text-[var(--color-success)]',
    warning: 'bg-[rgba(183,121,31,0.14)] text-[var(--color-warning)]',
    danger: 'bg-[rgba(197,48,48,0.12)] text-[var(--color-danger)]',
    neutral: 'bg-slate-100 text-slate-600',
  };

  const Component = shouldReduceMotion ? 'article' : motion.article;

  return (
    <Component
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={[
        'relative overflow-hidden rounded-[2rem] border border-[rgba(31,58,95,0.10)]',
        'bg-white p-5 shadow-[0_16px_42px_rgba(31,41,51,0.08)]',
        'transition-all duration-300 ease-out',
      ].join(' ')}
    >
      <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-[rgba(31,58,95,0.045)]" />

      <div className="relative z-10 grid gap-4">
        <div className={cn('grid size-14 place-items-center rounded-2xl', toneClasses[tone])}>
          {Icon && <Icon className="size-7" />}
        </div>

        <div className="grid gap-1">
          <span className="text-sm font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {title}
          </span>

          <strong className="text-3xl font-black leading-none text-[var(--color-primary)]">
            {value}
          </strong>

          {description && (
            <small className="font-bold leading-relaxed text-[var(--color-muted)]">
              {description}
            </small>
          )}
        </div>
      </div>
    </Component>
  );
};

export default QrSummaryCard;