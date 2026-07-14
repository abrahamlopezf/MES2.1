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
          'bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:-translate-y-0.5',
        secondary:
          'border border-border bg-card text-primary hover:bg-secondary/60 hover:-translate-y-0.5',
        success:
          'bg-success text-success-foreground shadow-lg hover:bg-success/90 hover:-translate-y-0.5',
        warning:
          'bg-warning text-warning-foreground shadow-lg hover:bg-warning/90 hover:-translate-y-0.5',
        danger:
          'bg-danger text-danger-foreground shadow-lg hover:bg-danger/90 hover:-translate-y-0.5',
        ghost:
          'bg-transparent text-primary hover:bg-secondary/50',
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