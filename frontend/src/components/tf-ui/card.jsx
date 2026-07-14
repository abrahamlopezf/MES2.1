import * as React from 'react';

import { cn } from '../../lib/utils';

const TFCard = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <section
      ref={ref}
      className={cn(
        [
          'overflow-hidden rounded-[2rem] border border-border',
          'bg-card text-card-foreground shadow-sm',
          'transition-all duration-300 ease-out',
        ].join(' '),
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
});

TFCard.displayName = 'TFCard';

const TFCardHeader = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <header
      ref={ref}
      className={cn(
        [
          'flex flex-col gap-3 border-b border-border',
          'bg-muted/30',
          'p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7',
        ].join(' '),
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
});

TFCardHeader.displayName = 'TFCardHeader';

const TFCardTitleGroup = ({ eyebrow, title, description, className }) => {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {eyebrow && (
        <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
      )}

      {title && (
        <h2 className="m-0 text-2xl font-black leading-tight text-primary sm:text-3xl">
          {title}
        </h2>
      )}

      {description && (
        <p className="m-0 max-w-3xl text-base font-medium leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
};

const TFCardActions = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end', className)}
      {...props}
    >
      {children}
    </div>
  );
});

TFCardActions.displayName = 'TFCardActions';

const TFCardContent = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('p-5 sm:p-7', className)} {...props}>
      {children}
    </div>
  );
});

TFCardContent.displayName = 'TFCardContent';

export {
  TFCard,
  TFCardHeader,
  TFCardTitleGroup,
  TFCardActions,
  TFCardContent,
};