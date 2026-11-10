import { createPortal } from 'react-dom';
import { X } from '@/design-system/components/Icon/googleIconCompat';
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
      className={`fixed inset-0 z-[200] flex flex-col justify-end transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:items-center sm:justify-center sm:p-6 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="absolute inset-0 bg-black/65 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="master-data-action-title"
        className={`relative z-[201] w-full sm:max-w-3xl sm:mx-auto bg-card rounded-t-3xl sm:rounded-2xl border-t sm:border border-border flex flex-col overflow-hidden max-h-[95dvh] sm:max-h-[90dvh] shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-100 sm:translate-y-2 sm:scale-[0.98]'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card sm:hidden"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-border flex justify-between items-center bg-card">
          <div className="flex flex-col min-w-0 pr-2">
            <h3 id="master-data-action-title" className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2 truncate">
              {title}
            </h3>
            {description && (
              <p className="italic text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
                {description}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            type="button"
            aria-label="Cerrar formulario de catálogo"
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-0 min-h-0 overflow-y-auto overflow-x-hidden flex-1 flex flex-col bg-background">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MaterialActionSheet;
