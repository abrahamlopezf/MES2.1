import {
  TFSheet,
  TFSheetContent,
  TFSheetDescription,
  TFSheetHeader,
  TFSheetTitle,
} from '../../../components/tf-ui';

const MaterialActionSheet = ({
  open,
  onClose,
  title,
  description,
  children,
}) => {
  return (
    <TFSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <TFSheetContent
        side="right"
        className="w-[min(94vw,620px)] p-5 sm:p-6"
      >
        <TFSheetHeader>
          <TFSheetTitle>{title}</TFSheetTitle>

          {description && (
            <TFSheetDescription>
              {description}
            </TFSheetDescription>
          )}
        </TFSheetHeader>

        <div className="mt-6">
          {children}
        </div>
      </TFSheetContent>
    </TFSheet>
  );
};

export default MaterialActionSheet;