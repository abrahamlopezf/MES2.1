import React, { useState } from 'react';
import { useSmartScanner } from './useSmartScanner';
import { QrCode, X } from 'lucide-react';
import { useAuth } from './AuthContext';

export const GlobalScannerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const { handleScan } = useSmartScanner();
  const { user } = useAuth();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      handleScan(qrCode.trim());
      setIsOpen(false);
      setQrCode('');
    }
  };

  if (!user) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-colors z-50 flex items-center justify-center"
      >
        <QrCode size={28} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode size={32} />
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Escanear QR</h2>
              <p className="text-center text-slate-600 mb-6 text-sm">
                Escanea un token QR. El sistema determinará la acción según tu rol ({user.role}).
              </p>

              <form onSubmit={onSubmit}>
                <input
                  autoFocus
                  type="text"
                  value={qrCode}
                  onChange={e => setQrCode(e.target.value)}
                  placeholder="ID del Token (ej. QR-10001)"
                  className="w-full text-center text-2xl p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none mb-4"
                />
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Procesar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
