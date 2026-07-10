import {
  TFSheet,
  TFSheetContent,
  TFSheetDescription,
  TFSheetHeader,
  TFSheetTitle,
} from '../../../components/tf-ui';

const QrActionSheet = ({
  open,
  onClose,
  title,
  description,
  children,
  side = 'right',
}) => {
  return (
    <TFSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <TFSheetContent
        side={side}
        className="w-[min(94vw,640px)] p-5 sm:p-6"
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

export default QrActionSheet;