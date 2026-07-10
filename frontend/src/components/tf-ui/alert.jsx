import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cva } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const alertVariants = cva(
  [
    'flex items-start gap-4 rounded-3xl border p-5',
    'shadow-[0_12px_30px_rgba(31,41,51,0.06)]',
  ].join(' '),
  {
    variants: {
      variant: {
        info: 'border-[rgba(31,58,95,0.16)] bg-[rgba(31,58,95,0.07)] text-[var(--color-primary)]',
        success: 'border-[rgba(47,133,90,0.20)] bg-[rgba(47,133,90,0.10)] text-[var(--color-success)]',
        warning: 'border-[rgba(183,121,31,0.22)] bg-[rgba(183,121,31,0.12)] text-[var(--color-warning)]',
        danger: 'border-[rgba(197,48,48,0.22)] bg-[rgba(197,48,48,0.10)] text-[var(--color-danger)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};

const TFAlert = ({ className, variant = 'info', title, message, children, ...props }) => {
  const Icon = iconMap[variant] || Info;

  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      <Icon className="mt-0.5 size-7 shrink-0" />

      <div className="grid gap-1">
        {title && <strong className="text-base font-black">{title}</strong>}
        {message && <p className="m-0 text-sm font-bold leading-relaxed">{message}</p>}
        {children}
      </div>
    </div>
  );
};

export { TFAlert, alertVariants };