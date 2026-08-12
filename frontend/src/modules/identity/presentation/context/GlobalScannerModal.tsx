import React, { useState } from 'react';
import { useSmartScanner } from './useSmartScanner';
import { QrCode, X, Camera } from 'lucide-react';
import { useAuth } from './AuthContext';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

export const GlobalScannerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const { handleScan } = useSmartScanner();
  const { user } = useAuth();

  React.useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setShowCamera(true); // Abrir la cámara directamente al abrir el modal
    };
    window.addEventListener('open-scanner', handleOpen);
    return () => window.removeEventListener('open-scanner', handleOpen);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      const success = await handleScan(qrCode.trim());
      if (success) {
        setIsOpen(false);
        setQrCode('');
        setShowCamera(false);
      }
    }
  };

  const handleCameraScan = async (code: string) => {
    if (code && code.trim()) {
      const success = await handleScan(code.trim());
      if (success) {
        setIsOpen(false);
        setShowCamera(false);
      }
    }
  };

  if (!user) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <QrCode size={24} className="text-blue-600" /> Escáner de Trazabilidad
              </h2>
              <button 
                onClick={() => { setIsOpen(false); setShowCamera(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {showCamera ? (
                <div className="w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden relative">
                  <CameraScanner 
                    title="Apunta al código QR"
                    onScan={handleCameraScan} 
                    onClose={() => setShowCamera(false)} 
                  />
                </div>
              ) : (
                <div className="py-8">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Camera size={40} />
                  </div>
                  <p className="text-center text-slate-600 mb-8 max-w-xs mx-auto">
                    La cámara está desactivada. Puedes ingresar el código manualmente o reactivar la cámara.
                  </p>
                  <form onSubmit={onSubmit} className="max-w-xs mx-auto">
                    <input
                      autoFocus
                      type="text"
                      value={qrCode}
                      onChange={e => setQrCode(e.target.value)}
                      placeholder="ID del Token (ej. QR-10001)"
                      className="w-full text-center text-xl p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none mb-4 uppercase font-mono"
                    />
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex justify-center items-center gap-2"
                      >
                        <Camera size={20} /> Cámara
                      </button>
                      <button 
                        type="submit"
                        disabled={!qrCode.trim()}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:shadow-none"
                      >
                        Buscar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
