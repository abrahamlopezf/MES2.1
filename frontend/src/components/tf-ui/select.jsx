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
      <label className={cn('grid gap-2 overflow-hidden w-full', containerClassName)}>
        {label && (
          <span className="text-sm font-bold text-foreground ml-1">
            {label}
          </span>
        )}

        <div className="relative w-full">
          <select
            ref={ref}
            name={name}
            className={cn(
              "flex min-h-[48px] w-full items-center rounded-2xl border bg-background px-4 text-base font-bold text-foreground transition-all duration-200 ease-out focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 cursor-pointer appearance-none !bg-background",
              error ? "border-destructive focus:border-destructive focus:shadow-destructive/20 animate-shake" : "border-border hover:border-primary",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            {...props}
          >
            <option value="" className="bg-background text-foreground">
              {placeholder}
            </option>

            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled} 
                className="bg-background text-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <svg className="size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        {error && (
          <span id={`${name}-error`} className="text-[0.8rem] font-medium text-destructive flex items-center gap-1.5 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
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