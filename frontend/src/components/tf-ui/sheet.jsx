import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';

const TFSheet = DialogPrimitive.Root;
const TFSheetTrigger = DialogPrimitive.Trigger;
const TFSheetClose = DialogPrimitive.Close;

const TFSheetOverlay = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-[9998] bg-slate-950/60 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  );
});

TFSheetOverlay.displayName = 'TFSheetOverlay';

const sheetSideClasses = {
  right:
    'right-0 top-0 h-dvh w-[min(92vw,420px)] border-l data-[state=open]:animate-[tfSheetRightIn_260ms_cubic-bezier(0.16,1,0.3,1)]',
  left:
    'left-0 top-0 h-dvh w-[min(92vw,420px)] border-r data-[state=open]:animate-[tfSheetLeftIn_260ms_cubic-bezier(0.16,1,0.3,1)]',
  bottom:
    'bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-[2rem] border-t data-[state=open]:animate-[tfSheetBottomIn_260ms_cubic-bezier(0.16,1,0.3,1)]',
};

const TFSheetContent = React.forwardRef(
  ({ className, children, side = 'right', showClose = true, ...props }, ref) => {
    return (
      <DialogPrimitive.Portal>
        <TFSheetOverlay />

        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            [
              'fixed z-[9999] overflow-y-auto border-[rgba(31,58,95,0.12)] bg-white',
              'p-5 shadow-[0_28px_80px_rgba(15,23,42,0.30)] focus:outline-none',
              sheetSideClasses[side],
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
      </DialogPrimitive.Portal>
    );
  }
);

TFSheetContent.displayName = 'TFSheetContent';

const TFSheetHeader = ({ className, ...props }) => {
  return <div className={cn('grid gap-2 pr-12', className)} {...props} />;
};

const TFSheetFooter = ({ className, ...props }) => {
  return <div className={cn('mt-6 grid gap-3 sm:flex sm:justify-end', className)} {...props} />;
};

const TFSheetTitle = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-2xl font-black text-[var(--color-primary)]', className)}
      {...props}
    />
  );
});

TFSheetTitle.displayName = 'TFSheetTitle';

const TFSheetDescription = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-base font-medium leading-relaxed text-[var(--color-muted)]', className)}
      {...props}
    />
  );
});

TFSheetDescription.displayName = 'TFSheetDescription';

export {
  TFSheet,
  TFSheetTrigger,
  TFSheetClose,
  TFSheetContent,
  TFSheetHeader,
  TFSheetFooter,
  TFSheetTitle,
  TFSheetDescription,
};