import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { tokens } from '../../foundation/tokens';

export const CameraScanner = ({ title = "Escáner Industrial", onScan, onClose }) => {
  const onScanRef = React.useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Configuración optimizada para escaneo rápido en móviles
    const scanner = new Html5QrcodeScanner('qr-reader-container', { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true
    }, false);
    
    scanner.render((text) => {
      scanner.clear();
      if (onScanRef.current) {
        onScanRef.current(text);
      }
    }, (err) => {
      // Errores de frame (normales durante escaneo), no hacer nada
    });

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: tokens.primitive.colors.zinc950, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        /* Overrides for html5-qrcode default UI */
        #qr-reader-container {
          border: none !important;
          border-radius: ${tokens.primitive.spacing['16']} !important;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
          background-color: ${tokens.primitive.colors.zinc900} !important;
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
          opacity: 0.2 !important; 
        }

        /* Text inside the dashboard */
        #qr-reader-container__dashboard_section_csr span {
          color: ${tokens.semantic.color.textHighEmphasis} !important;
          font-family: ${tokens.primitive.typography.sans} !important;
          font-size: ${tokens.primitive.typography.sizes.md} !important;
        }

        /* Style the 'Request Permissions' button */
        #qr-reader-container__dashboard_section_csr button {
          background-color: ${tokens.semantic.color.primary} !important;
          color: ${tokens.primitive.colors.zinc50} !important;
          padding: ${tokens.primitive.spacing['16']} ${tokens.primitive.spacing['32']} !important;
          border-radius: ${tokens.primitive.spacing['8']} !important;
          font-family: ${tokens.primitive.typography.sans} !important;
          font-size: ${tokens.primitive.typography.sizes.md} !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin-top: ${tokens.primitive.spacing['24']} !important;
          transition: all 0.2s ease;
          width: auto !important;
        }
        
        #qr-reader-container__dashboard_section_csr button:hover {
          background-color: ${tokens.semantic.color.primaryHover} !important;
        }

        /* HIDE the 'Scan an Image File' link */
        #qr-reader-container a {
          display: none !important;
        }

        /* Style the camera select dropdown */
        #qr-reader-container select {
          background-color: ${tokens.primitive.colors.zinc800} !important;
          color: ${tokens.semantic.color.textHighEmphasis} !important;
          border: 1px solid ${tokens.semantic.color.borderDefault} !important;
          padding: ${tokens.primitive.spacing['12']} ${tokens.primitive.spacing['16']} !important;
          border-radius: ${tokens.primitive.spacing['8']} !important;
          font-family: ${tokens.primitive.typography.sans} !important;
          margin-bottom: ${tokens.primitive.spacing['16']} !important;
          width: 100%;
          outline: none !important;
        }

        /* Style the video feed */
        #qr-reader-container video {
          border-radius: ${tokens.primitive.spacing['16']} !important;
          object-fit: cover;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: tokens.primitive.spacing['16'], backgroundColor: tokens.primitive.colors.zinc900, borderBottom: `1px solid ${tokens.semantic.color.borderDefault}` }}>
        <h2 style={{ color: tokens.semantic.color.textHighEmphasis, margin: 0, fontSize: tokens.primitive.typography.sizes.lg, fontWeight: 600 }}>{title}</h2>
        <button 
          onClick={onClose} 
          style={{ backgroundColor: 'transparent', border: 'none', color: tokens.semantic.color.danger, fontSize: tokens.primitive.typography.sizes.md, fontWeight: 'bold', cursor: 'pointer', padding: tokens.primitive.spacing['8'] }}
        >
          Cerrar
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.primitive.colors.zinc950, padding: tokens.primitive.spacing['24'] }}>
        <div id="qr-reader-container" style={{ width: '100%', maxWidth: '500px' }}></div>
      </div>
    </div>
  );
};
