import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import { TFButton } from '../components/tf-ui/button';

const ConfirmContext = createContext();

export const useConfirmAction = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmAction must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: '¿Está seguro?',
    message: '¿Está seguro de realizar esta acción?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'warning', // 'warning', 'danger', 'info'
    hideCancel: false,
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Freeze the background when the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('global-modal-open');
    } else {
      document.body.classList.remove('global-modal-open');
    }
    return () => document.body.classList.remove('global-modal-open');
  }, [isOpen]);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Confirmar Acción',
        message: options.message || '¿Está seguro de realizar esta acción?',
        confirmText: options.confirmText || 'Sí, confirmar',
        cancelText: options.cancelText || 'Cancelar',
        variant: options.variant || 'warning',
        hideCancel: options.hideCancel || false,
        onConfirm: async () => {
          if (typeof options.action === 'function') {
            await options.action();
          }
          setIsOpen(false);
          resolve(true);
        },
        onCancel: () => {
          setIsOpen(false);
          resolve(false);
        }
      });
      setIsOpen(true);
    });
  }, []);

  // Hook específico para onSubmit de react-hook-form o forms normales
  const withConfirm = useCallback((actionFn, options = {}) => {
    return async (...args) => {
      // Si el evento existe y tiene preventDefault, lo llamamos para que no recargue
      const event = args.find(a => a && typeof a.preventDefault === 'function');
      if (event) {
        event.preventDefault();
      }

      const confirmed = await confirm(options);
      if (confirmed) {
        return actionFn(...args);
      }
    };
  }, [confirm]);

  return (
    <ConfirmContext.Provider value={{ confirm, withConfirm }}>
      {children}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={config.onCancel} />
          
          <div className="relative w-[90%] max-w-md bg-card rounded-3xl shadow-2xl border border-border p-6 flex flex-col gap-6 animate-page-enter">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl flex items-center justify-center ${
                  config.variant === 'danger' ? 'bg-danger/10 text-danger' :
                  config.variant === 'warning' ? 'bg-warning/10 text-warning' :
                  'bg-primary/10 text-primary'
                }`}>
                  {config.variant === 'info' ? <Info size={24} /> : <AlertTriangle size={24} />}
                </div>
                <h2 className="text-xl font-bold text-foreground">{config.title}</h2>
              </div>
              <button 
                onClick={config.onCancel}
                className="p-2 bg-secondary/50 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-muted-foreground text-base leading-relaxed">
              {config.message}
            </p>

            <div className="flex gap-3 justify-end mt-4">
            {!config.hideCancel && (
              <TFButton 
                variant="secondary" 
                onClick={config.onCancel}
                className="font-bold flex-1 sm:flex-none"
              >
                {config.cancelText}
              </TFButton>
            )}
            <TFButton 
              variant={config.variant === 'danger' ? 'danger' : 'primary'}
              onClick={config.onConfirm}
              className="font-bold flex-1 sm:flex-none"
            >
              {config.confirmText}
            </TFButton>
          </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};
