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
      <label className={cn('grid gap-2 overflow-hidden w-full', containerClassName)}>
        {label && (
          <span className="text-sm font-bold text-foreground ml-1">
            {label}
          </span>
        )}

        <div
          className={cn(
            [
              'flex min-h-[48px] items-center gap-3 rounded-2xl border bg-background px-4 min-w-0',
              'transition-all duration-200 ease-out',
              'focus-within:outline-none focus-within:border-primary focus-within:shadow-[0_0_0_4px] focus-within:shadow-primary/20',
              error ? 'border-destructive focus-within:border-destructive focus-within:shadow-destructive/20 animate-shake' : 'border-border hover:border-primary',
            ].join(' ')
          )}
        >
          {Icon && <Icon className="size-5 shrink-0 text-primary" />}

          <input
            ref={ref}
            name={name}
            className={cn(
              "h-full w-full !bg-transparent text-base font-semibold text-foreground !border-0 !ring-0 !outline-none !p-0 placeholder:text-muted-foreground/60",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            {...props}
          />
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
          <span className="text-sm font-bold text-foreground ml-1">
            {label}
          </span>
        )}

        <textarea
          ref={ref}
          name={name}
          className={cn(
            [
              'min-h-32 w-full resize-y rounded-2xl border !border-border !bg-background px-4 py-3',
              'text-base font-medium text-foreground transition-all duration-200',
              'outline-none placeholder:text-muted-foreground/60',
              'focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20',
              error ? 'border-destructive focus:border-destructive focus:shadow-destructive/20 animate-shake' : 'hover:border-primary',
            ].join(' '),
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />

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

TFTextarea.displayName = 'TFTextarea';

export { TFInput, TFTextarea };