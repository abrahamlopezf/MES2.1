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
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-muted text-muted-foreground',
  };

  const Component = shouldReduceMotion ? 'article' : motion.article;

  return (
    <Component
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={[
        'relative overflow-hidden rounded-[2rem] border border-[rgba(31,58,95,0.10)]',
        'bg-card p-5 shadow-lg',
        'transition-all duration-300 ease-out',
      ].join(' ')}
    >
      <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-[rgba(31,58,95,0.045)]" />

      <div className="relative z-10 grid gap-4">
        <div className={cn('grid size-14 place-items-center rounded-2xl', toneClasses[tone])}>
          {Icon && <Icon className="size-7" />}
        </div>

        <div className="grid gap-1">
          <span className="text-sm font-black uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </span>

          <strong className="text-3xl font-black leading-none text-primary">
            {value}
          </strong>

          {description && (
            <small className="font-bold leading-relaxed text-muted-foreground">
              {description}
            </small>
          )}
        </div>
      </div>
    </Component>
  );
};

export default QrSummaryCard;