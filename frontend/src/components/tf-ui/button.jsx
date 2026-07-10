import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl',
    'font-black tracking-tight',
    'transition-all duration-300 ease-out',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(31,58,95,0.22)]',
    'disabled:pointer-events-none disabled:opacity-60',
    'aria-disabled:pointer-events-none aria-disabled:opacity-60',
    'active:scale-[0.97]',
    'min-h-14',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-white shadow-[0_14px_32px_rgba(31,58,95,0.22)] hover:bg-[var(--color-primary-dark)] hover:-translate-y-0.5',
        secondary:
          'border border-[var(--color-border)] bg-white text-[var(--color-primary)] hover:bg-[rgba(31,58,95,0.06)] hover:-translate-y-0.5',
        success:
          'bg-[var(--color-success)] text-white shadow-[0_14px_32px_rgba(47,133,90,0.20)] hover:-translate-y-0.5',
        warning:
          'bg-[var(--color-warning)] text-white shadow-[0_14px_32px_rgba(183,121,31,0.20)] hover:-translate-y-0.5',
        danger:
          'bg-[var(--color-danger)] text-white shadow-[0_14px_32px_rgba(197,48,48,0.20)] hover:-translate-y-0.5',
        ghost:
          'bg-transparent text-[var(--color-primary)] hover:bg-[rgba(31,58,95,0.07)]',
      },
      size: {
        sm: 'min-h-12 px-4 text-sm rounded-xl',
        md: 'min-h-14 px-5 text-base',
        lg: 'min-h-16 px-7 text-lg rounded-3xl',
        icon: 'size-14 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

const TFButton = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      isLoading = false,
      icon: Icon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={classes}
          aria-disabled={disabled || isLoading}
          data-loading={isLoading ? 'true' : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        data-loading={isLoading ? 'true' : undefined}
        {...props}
      >
        {Icon && <Icon className="size-5 shrink-0" />}
        <span>{isLoading ? 'Procesando...' : children}</span>
      </button>
    );
  }
);

TFButton.displayName = 'TFButton';

export { TFButton, buttonVariants };