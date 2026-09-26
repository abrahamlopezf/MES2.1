import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export const CameraScanner = ({ title = "Escáner Industrial", onScan, onClose, inline = false }) => {
  const onScanRef = React.useRef(onScan);
  const hasScannedRef = React.useRef(false);
  const scannerId = React.useMemo(() => 'qr-reader-' + Math.random().toString(36).substr(2, 9), []);
  const [cameraError, setCameraError] = React.useState(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;
    let scanner = null;
    let initTimeout = null;

    const initScanner = async () => {
      if (!isMounted) return;
      
      // Wait for any global scanner clear to finish (StrictMode workaround)
      while (window.__scannerClearing) {
        await new Promise(r => setTimeout(r, 50));
      }
      
      if (!isMounted) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Tu navegador ha bloqueado el acceso a la cámara. Esto suele ocurrir porque la página no se está cargando a través de una conexión segura (HTTPS). Por favor, instala un certificado SSL o cambia a localhost.");
        return;
      }

      const container = document.getElementById(scannerId);
      if (container && container.innerHTML.trim() !== '') {
        container.innerHTML = '';
      }

      scanner = new Html5QrcodeScanner(scannerId, { 
        fps: 10, 
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdgePercentage = 0.7; // 70% of the screen
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          
          // Prevenir crash: "minimum size of 'config.qrbox' dimension value is 50px"
          // Ocurre cuando el contenedor aún no tiene dimensiones reales en el DOM.
          if (qrboxSize < 50) {
            qrboxSize = 250;
          }

          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        showTorchButtonIfSupported: true,
        formatsToSupport: [ 0 ] 
      }, false);
      
      scanner.render((text) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;
        
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
        // Ignorar errores de frame
      });
    };

    // Delay initialization to avoid React 18 StrictMode double-render bug
    initTimeout = setTimeout(initScanner, 150);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      if (!hasScannedRef.current && scanner) {
        window.__scannerClearing = true;
        scanner.clear().catch((e) => {
          console.warn("Scanner unmount error ignored", e);
        }).finally(() => {
          window.__scannerClearing = false;
        });
      }
    };
  }, [scannerId]);

  return (
    <div className={inline ? "flex flex-col w-full h-full" : "fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"}>
      <div className={inline ? "flex-1 w-full h-full flex flex-col relative" : "w-full max-w-[600px] bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden relative"}>
      <style>{`
        /* Overrides for html5-qrcode default UI */
        #${scannerId} {
          border: none !important;
          border-radius: var(--radius) !important;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          background-color: var(--card) !important;
        }
        
        /* Remove ALL borders from inner injected elements */
        #${scannerId} * {
          border: none !important;
          box-shadow: none !important;
        }

        /* Hide the annoying info icon and header */
        #${scannerId}__header_message {
          display: none !important;
        }
        #${scannerId} img[alt="Info icon"] {
          display: none !important;
        }
        
        /* Soften the big camera icon */
        #${scannerId} img {
          opacity: 0.1 !important; 
        }

        /* Style the 'Stop Scanning' and other buttons */
        #${scannerId}__dashboard_section_csr button {
          background-color: var(--primary);
          color: var(--primary-foreground);
          padding: 0.5rem 1rem;
          border-radius: var(--radius);
          font-weight: 500;
          cursor: pointer;
          margin-top: 1rem;
          transition: background-color 0.2s;
        }
        
        #${scannerId}__dashboard_section_csr button:hover {
          background-color: var(--primary)/90;
        }

        /* Hide the 'Scan an Image File' link */
        #${scannerId} a {
          color: var(--primary);
          text-decoration: underline;
        }

        /* Style the camera select dropdown */
        #${scannerId} select {
          padding: 0.5rem;
          border-radius: var(--radius);
          background-color: var(--secondary);
          color: var(--foreground);
          border: 1px solid var(--border) !important;
          margin-bottom: 0.5rem;
          width: 100%;
        }

        /* Style the video feed */
        #${scannerId} video {
          border-radius: var(--radius) !important;
          object-fit: cover;
        }
      `}</style>

      {/* Header */}
      {!inline && (
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
      )}

      <div className={`flex-1 flex items-center justify-center bg-background/50 ${inline ? 'p-0 py-2' : 'p-6 pb-8'}`}>
        {cameraError ? (
          <div className={`w-full ${inline ? 'max-w-[300px]' : 'max-w-[500px]'} p-6 bg-destructive/10 text-destructive text-center rounded-xl font-medium border border-destructive/20 flex flex-col items-center gap-3`}>
            <Camera className="w-10 h-10 opacity-70" />
            <p>{cameraError}</p>
          </div>
        ) : (
          <div id={scannerId} className={`w-full ${inline ? 'max-w-[300px]' : 'max-w-[500px]'} border border-border shadow-md rounded-xl overflow-hidden`}></div>
        )}
      </div>
      </div>
    </div>
  );
};
