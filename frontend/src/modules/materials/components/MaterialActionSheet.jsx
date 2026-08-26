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
        className="w-[min(94vw,620px)] p-5 sm:p-6 overflow-y-auto"
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