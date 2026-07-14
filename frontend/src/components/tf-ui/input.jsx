import * as React from 'react';

import { cn } from '../../lib/utils';

const TFInput = React.forwardRef(
  (
    {
      className,
      label,
      helperText,
      error,
      icon: Icon,
      name,
      containerClassName,
      ...props
    },
    ref
  ) => {
    return (
      <label className={cn('grid gap-2', containerClassName)}>
        {label && (
          <span className="text-base font-black text-foreground">
            {label}
          </span>
        )}

        <div
          className={cn(
            [
              'flex min-h-15 items-center gap-3 rounded-2xl border bg-card px-4',
              'transition-all duration-300 ease-out',
              'focus-within:-translate-y-0.5 focus-within:border-primary',
              'focus-within:shadow-[0_0_0_4px] focus-within:shadow-ring/20',
              error ? 'border-danger' : 'border-border',
            ].join(' ')
          )}
        >
          {Icon && <Icon className="size-5 shrink-0 text-primary" />}

          <input
            ref={ref}
            name={name}
            className={cn(
              [
                'min-h-14 w-full bg-transparent text-base font-semibold text-foreground',
                'outline-none placeholder:text-muted-foreground',
              ].join(' '),
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            {...props}
          />
        </div>

        {error && (
          <span id={`${name}-error`} className="text-sm font-black text-danger">
            {error}
          </span>
        )}

        {!error && helperText && (
          <span className="text-sm font-bold text-muted-foreground">
            {helperText}
          </span>
        )}
      </label>
    );
  }
);

TFInput.displayName = 'TFInput';

const TFTextarea = React.forwardRef(
  (
    {
      className,
      label,
      helperText,
      error,
      name,
      containerClassName,
      ...props
    },
    ref
  ) => {
    return (
      <label className={cn('grid gap-2', containerClassName)}>
        {label && (
          <span className="text-base font-black text-[var(--color-text)]">
            {label}
          </span>
        )}

        <textarea
          ref={ref}
          name={name}
          className={cn(
            [
              'min-h-32 w-full resize-y rounded-2xl border bg-card px-4 py-4',
              'text-base font-semibold text-foreground',
              'outline-none transition-all duration-300 ease-out',
              'placeholder:text-muted-foreground',
              'focus:-translate-y-0.5 focus:border-primary',
              'focus:shadow-[0_0_0_4px] focus:shadow-ring/20',
              error ? 'border-danger' : 'border-border',
            ].join(' '),
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />

        {error && (
          <span id={`${name}-error`} className="text-sm font-black text-[var(--color-danger)]">
            {error}
          </span>
        )}

        {!error && helperText && (
          <span className="text-sm font-bold text-[var(--color-muted)]">
            {helperText}
          </span>
        )}
      </label>
    );
  }
);

TFTextarea.displayName = 'TFTextarea';

export { TFInput, TFTextarea };