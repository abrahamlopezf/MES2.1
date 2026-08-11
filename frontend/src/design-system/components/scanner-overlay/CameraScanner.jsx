import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export const CameraScanner = ({ title = "Escáner Industrial", onScan, onClose }) => {
  const onScanRef = React.useRef(onScan);
  const hasScannedRef = React.useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Configuración optimizada para escaneo de QRs industriales complejos (con logos)
    const scanner = new Html5QrcodeScanner('qr-reader-container', { 
      fps: 10, 
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdgePercentage = 0.7; // 70% of the screen
        const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
        return {
          width: qrboxSize,
          height: qrboxSize
        };
      },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      formatsToSupport: [ 0 ] // 0 es Html5QrcodeSupportedFormats.QR_CODE (acelera la lectura ignorando códigos de barras)
    }, false);
    
    scanner.render((text) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      
      // Detener el escáner ANTES de disparar onScan para evitar que
      // React desmonte el DOM mientras la librería sigue procesando.
      try {
        scanner.clear().then(() => {
          if (onScanRef.current) onScanRef.current(text);
        }).catch(() => {
          if (onScanRef.current) onScanRef.current(text);
        });
      } catch(e) {
        if (onScanRef.current) onScanRef.current(text);
      }

    }, (err) => {
      // Errores de frame (normales durante escaneo), no hacer nada
    });

    return () => {
      if (!hasScannedRef.current) {
        try {
          if (scanner) {
            scanner.clear().catch(() => {});
          }
        } catch (e) {
          console.warn("Scanner unmount error ignored", e);
        }
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      <style>{`
        /* Overrides for html5-qrcode default UI */
        #qr-reader-container {
          border: none !important;
          border-radius: var(--radius) !important;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          background-color: var(--card) !important;
        }
        
        /* Remove ALL borders from inner injected elements */
        #qr-reader-container * {
          border: none !important;
          box-shadow: none !important;
        }

        /* Hide the annoying info icon and header */
        #qr-reader-container__header_message {
          display: none !important;
        }
        #qr-reader-container img[alt="Info icon"] {
          display: none !important;
        }
        
        /* Soften the big camera icon */
        #qr-reader-container img {
          opacity: 0.1 !important; 
        }

        /* Text inside the dashboard */
        #qr-reader-container__dashboard_section_csr span {
          color: var(--foreground) !important;
          font-family: inherit !important;
          font-size: 1rem !important;
        }

        /* Style the 'Request Permissions' button */
        #qr-reader-container__dashboard_section_csr button {
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
          padding: 12px 24px !important;
          border-radius: var(--radius) !important;
          font-family: inherit !important;
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin-top: 16px !important;
          transition: opacity 0.2s ease;
          width: auto !important;
        }
        
        #qr-reader-container__dashboard_section_csr button:hover {
          opacity: 0.9 !important;
        }

        /* HIDE the 'Scan an Image File' link */
        #qr-reader-container a {
          display: none !important;
        }

        /* Style the camera select dropdown */
        #qr-reader-container select {
          background-color: var(--input) !important;
          color: var(--foreground) !important;
          border: 1px solid var(--border) !important;
          padding: 8px 12px !important;
          border-radius: var(--radius) !important;
          font-family: inherit !important;
          margin-bottom: 16px !important;
          width: 100%;
          outline: none !important;
        }

        /* Style the video feed */
        #qr-reader-container video {
          border-radius: var(--radius) !important;
          object-fit: cover;
        }
      `}</style>

      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Camera className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-foreground m-0">{title}</h2>
        </div>
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
          Cerrar
        </button>
      </header>

      {/* Scanner Container */}
      <div className="flex-1 flex items-center justify-center bg-background/95 p-6">
        <div id="qr-reader-container" className="w-full max-w-[500px] border border-border shadow-xl rounded-xl"></div>
      </div>
    </div>
  );
};
