import { cva } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  [
    'inline-flex min-h-8 w-fit items-center justify-center rounded-full px-3 py-1',
    'text-xs font-black uppercase tracking-[0.04em]',
  ].join(' '),
  {
    variants: {
      variant: {
        neutral: 'bg-slate-100 text-slate-600',
        primary: 'bg-[rgba(31,58,95,0.10)] text-[var(--color-primary)]',
        success: 'bg-[rgba(47,133,90,0.12)] text-[var(--color-success)]',
        warning: 'bg-[rgba(183,121,31,0.14)] text-[var(--color-warning)]',
        danger: 'bg-[rgba(197,48,48,0.12)] text-[var(--color-danger)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

const TFBadge = ({ className, variant, children, ...props }) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
};

export { TFBadge, badgeVariants };