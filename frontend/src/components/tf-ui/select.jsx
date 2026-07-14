import * as React from 'react';

import { cn } from '../../lib/utils';

const TFSelect = React.forwardRef(
  (
    {
      className,
      label,
      helperText,
      error,
      options = [],
      placeholder = 'Selecciona una opción',
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
              'flex min-h-15 items-center rounded-2xl border bg-card px-4',
              'transition-all duration-300 ease-out',
              'focus-within:-translate-y-0.5 focus-within:border-primary',
              'focus-within:shadow-[0_0_0_4px] focus-within:shadow-ring/20',
              error ? 'border-danger' : 'border-border',
            ].join(' ')
          )}
        >
          <select
            ref={ref}
            name={name}
            className={cn(
              [
                'min-h-14 w-full cursor-pointer bg-transparent text-base font-bold',
                'text-foreground outline-none',
              ].join(' '),
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            {...props}
          >
            <option value="">{placeholder}</option>

            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

TFSelect.displayName = 'TFSelect';

export { TFSelect };