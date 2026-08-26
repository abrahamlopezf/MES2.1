import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet';

const MaterialActionSheet = ({
  open,
  onClose,
  title,
  description,
  children,
}) => {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:w-[min(94vw,620px)] p-4 sm:p-6 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-6"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>

          {description && (
            <SheetDescription>
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MaterialActionSheet;