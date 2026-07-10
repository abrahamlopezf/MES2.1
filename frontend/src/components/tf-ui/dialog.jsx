import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';

const TFDialog = DialogPrimitive.Root;
const TFDialogTrigger = DialogPrimitive.Trigger;
const TFDialogClose = DialogPrimitive.Close;

const TFDialogPortal = ({ children }) => {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
};

const TFDialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        [
          'fixed inset-0 z-[9998] bg-slate-950/60 backdrop-blur-sm',
          'data-[state=open]:animate-[tfOverlayIn_180ms_ease-out]',
          'data-[state=closed]:animate-[tfOverlayOut_160ms_ease-in]',
        ].join(' '),
        className
      )}
      {...props}
    />
  );
});

TFDialogOverlay.displayName = 'TFDialogOverlay';

const TFDialogContent = React.forwardRef(
  ({ className, children, showClose = true, ...props }, ref) => {
    return (
      <TFDialogPortal>
        <TFDialogOverlay />

        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            [
              'fixed left-1/2 top-1/2 z-[9999] grid w-[calc(100vw-2rem)]',
              'max-w-xl -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[2rem]',
              'border border-[rgba(31,58,95,0.12)] bg-white p-6',
              'shadow-[0_28px_80px_rgba(15,23,42,0.30)]',
              'focus:outline-none',
              'data-[state=open]:animate-[tfDialogIn_240ms_cubic-bezier(0.16,1,0.3,1)]',
              'data-[state=closed]:animate-[tfDialogOut_160ms_ease-in]',
            ].join(' '),
            className
          )}
          {...props}
        >
          {children}

          {showClose && (
            <DialogPrimitive.Close
              className={cn(
                [
                  'absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-2xl',
                  'bg-[rgba(31,58,95,0.08)] text-[var(--color-primary)]',
                  'transition-all hover:bg-[rgba(31,58,95,0.14)] focus:outline-none',
                  'focus-visible:ring-4 focus-visible:ring-[rgba(31,58,95,0.18)]',
                ].join(' ')
              )}
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </TFDialogPortal>
    );
  }
);

TFDialogContent.displayName = 'TFDialogContent';

const TFDialogHeader = ({ className, ...props }) => {
  return <div className={cn('grid gap-2 pr-12', className)} {...props} />;
};

const TFDialogFooter = ({ className, ...props }) => {
  return (
    <div
      className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
};

const TFDialogTitle = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-2xl font-black text-[var(--color-primary)]', className)}
      {...props}
    />
  );
});

TFDialogTitle.displayName = 'TFDialogTitle';

const TFDialogDescription = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-base font-medium leading-relaxed text-[var(--color-muted)]', className)}
      {...props}
    />
  );
});

TFDialogDescription.displayName = 'TFDialogDescription';

export {
  TFDialog,
  TFDialogTrigger,
  TFDialogClose,
  TFDialogContent,
  TFDialogHeader,
  TFDialogFooter,
  TFDialogTitle,
  TFDialogDescription,
};