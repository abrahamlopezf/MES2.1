import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export const CameraScanner = ({ title = "Escáner Industrial", onScan, onClose, inline = false }) => {
  const onScanRef = React.useRef(onScan);
  const hasScannedRef = React.useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const initScanner = () => {
      if (!isMounted) return;
      
      // Prevent double initialization if container already has content
      const container = document.getElementById('qr-reader-container');
      if (container && container.innerHTML.trim() !== '') {
        container.innerHTML = '';
      }

      scanner = new Html5QrcodeScanner('qr-reader-container', { 
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
    const timer = setTimeout(initScanner, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (!hasScannedRef.current && scanner) {
        try {
          scanner.clear().catch(() => {});
        } catch (e) {
          console.warn("Scanner unmount error ignored", e);
        }
      }
    };
  }, []);

  return (
    <div className={inline ? "flex flex-col w-full h-full" : "fixed inset-0 z-[9999] bg-background flex flex-col"}>
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

        /* Hide the text inside the dashboard */
        #qr-reader-container__dashboard_section_csr span {
          display: none !important;
        }

        /* Hide the 'Stop Scanning' and other buttons */
        #qr-reader-container__dashboard_section_csr button {
          display: none !important;
        }

        /* Hide the 'Scan an Image File' link */
        #qr-reader-container a {
          display: none !important;
        }

        /* Hide the camera select dropdown */
        #qr-reader-container select {
          display: none !important;
        }

        /* Style the video feed */
        #qr-reader-container video {
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

      {/* Scanner Container */}
      <div className={`flex-1 flex items-center justify-center bg-background/95 ${inline ? 'p-0 py-2' : 'p-6'}`}>
        <div id="qr-reader-container" className={`w-full ${inline ? 'max-w-[300px]' : 'max-w-[500px]'} border border-border shadow-xl rounded-xl overflow-hidden`}></div>
      </div>
    </div>
  );
};
