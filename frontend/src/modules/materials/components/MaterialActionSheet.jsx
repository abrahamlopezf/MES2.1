import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBottomSheetAnimation } from '../../../hooks/useBottomSheetAnimation';

const MaterialActionSheet = ({
  open,
  onClose,
  title,
  description,
  children,
}) => {
  const {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers
  } = useBottomSheetAnimation(open, 400);

  if (!isRendered) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full sm:max-w-3xl sm:mx-auto bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[95dvh] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              {title}
            </h3>
            {description && (
              <p className="italic text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 ml-4"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-0 sm:p-2 overflow-hidden flex-1 flex flex-col bg-background">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MaterialActionSheet;