import React, { useRef, useState } from 'react';
import { Button, Icon } from '@/design-system';
import { CameraScanner } from '@/design-system/components/scanner-overlay/CameraScanner';

interface QrScannerButtonProps {
  onScan: (code: string) => void;
  title: string;
  disabled?: boolean;
}

/** Scanner action scoped to the QR field that opened it. */
export const QrScannerButton: React.FC<QrScannerButtonProps> = ({ onScan, title, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          // Keep nested scanners inside their parent dialog so its focus trap
          // includes the manual entry field and keyboard input remains usable.
          setPortalContainer(buttonRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null);
          setIsOpen(true);
        }}
        className="h-11 shrink-0 gap-1.5 px-3"
        title={title}
      >
        <Icon name="qr_code_scanner" size={18} />
        <span className="hidden sm:inline">Escanear</span>
      </Button>
      {isOpen && (
        <CameraScanner
          title={title}
          portalContainer={portalContainer}
          subtitle="El código se aplicará al campo que abrió este escáner."
          onScan={(code: string) => {
            onScan(code);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default QrScannerButton;
