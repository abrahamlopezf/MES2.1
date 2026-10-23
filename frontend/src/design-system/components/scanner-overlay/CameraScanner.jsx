import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertTriangle, SwitchCamera, Keyboard, Check, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const CameraScanner = ({
  title = 'Escáner Industrial',
  subtitle,
  expectedCode,
  onScan,
  onClose,
  inline = false,
}) => {
  const containerId = useMemo(
    () => 'qr-camera-stream-' + Math.random().toString(36).substring(2, 9),
    []
  );

  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error al detener scanner:', e);
      }
      scannerRef.current = null;
    }
  };

  const startCamera = async (cameraIdOverride) => {
    try {
      setIsInitializing(true);
      setCameraError(null);

      await stopScanner();

      // Verificar soporte de getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'El navegador no permite el acceso a la cámara. Asegúrese de estar ejecutando en localhost o con HTTPS seguro.'
        );
        setIsInitializing(false);
        return;
      }

      // Descubrir dispositivos de cámara disponibles
      let availableCameras = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
        setCameras(availableCameras || []);
      } catch (err) {
        console.warn('No se pudo enumerar cámaras previas:', err);
      }

      const instance = new Html5Qrcode(containerId);
      scannerRef.current = instance;

      const successCallback = (decodedText) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;

        // Intentar detener suavemente la cámara y disparar callback
        try {
          if (instance.isScanning) {
            instance
              .stop()
              .then(() => {
                if (onScanRef.current) onScanRef.current(decodedText.trim());
              })
              .catch(() => {
                if (onScanRef.current) onScanRef.current(decodedText.trim());
              });
          } else {
            if (onScanRef.current) onScanRef.current(decodedText.trim());
          }
        } catch {
          if (onScanRef.current) onScanRef.current(decodedText.trim());
        }
      };

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      // Determinar qué cámara usar
      let chosenCameraConfig = null;

      if (cameraIdOverride) {
        chosenCameraConfig = { deviceId: { exact: cameraIdOverride } };
        setActiveCameraId(cameraIdOverride);
      } else if (availableCameras && availableCameras.length > 0) {
        // En móviles/tablets priorizar cámara trasera
        const rearCamera = availableCameras.find((c) =>
          /back|rear|trasera|environment/i.test(c.label)
        );
        const selected = rearCamera || availableCameras[0];
        chosenCameraConfig = { deviceId: { exact: selected.id } };
        setActiveCameraId(selected.id);
      } else {
        // Si no hay lista previa, pedir cámara por facingMode
        chosenCameraConfig = { facingMode: 'environment' };
      }

      try {
        await instance.start(chosenCameraConfig, qrConfig, successCallback, () => {});
        setIsInitializing(false);
      } catch (firstErr) {
        console.warn('Primer intento de inicio de cámara falló, probando fallback:', firstErr);
        // Fallback para laptops/webcams sin soporte exacto de environment
        try {
          const fallbackConfig =
            availableCameras && availableCameras.length > 0
              ? { deviceId: { exact: availableCameras[0].id } }
              : { facingMode: 'user' };

          if (availableCameras && availableCameras.length > 0) {
            setActiveCameraId(availableCameras[0].id);
          }

          await instance.start(fallbackConfig, qrConfig, successCallback, () => {});
          setIsInitializing(false);
        } catch (secondErr) {
          console.error('Fallo definitivo al iniciar cámara:', secondErr);
          let msg = 'No fue posible iniciar la cámara.';
          if (secondErr?.name === 'NotAllowedError' || secondErr?.message?.includes('Permission')) {
            msg = 'Acceso a la cámara denegado. Permite el permiso de cámara en tu navegador.';
          } else if (secondErr?.name === 'NotFoundError' || secondErr?.message?.includes('device')) {
            msg = 'No se detectó ninguna cámara de video en este dispositivo.';
          } else if (secondErr?.name === 'NotReadableError') {
            msg = 'La cámara está siendo utilizada por otra aplicación o pestaña.';
          } else {
            msg = secondErr?.message || 'Error de hardware al inicializar cámara.';
          }
          setCameraError(msg);
          setIsInitializing(false);
        }
      }
    } catch (err) {
      console.error('Error general de cámara:', err);
      setCameraError(err?.message || 'Error al iniciar escáner de cámara.');
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [containerId]);

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    if (nextCamera) {
      setActiveCameraId(nextCamera.id);
      startCamera(nextCamera.id);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualInput.trim().toUpperCase();
    if (!clean) return;
    if (onScanRef.current) {
      onScanRef.current(clean);
    }
  };

  const content = (
    <div
      className={
        inline
          ? 'flex flex-col w-full h-full'
          : 'fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150'
      }
      style={{ isolation: 'isolate' }}
    >
      <div
        className={
          inline
            ? 'flex-1 w-full h-full flex flex-col relative'
            : 'w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden relative'
        }
      >
        <style>{`
          #${containerId} {
            width: 100% !important;
            height: 100% !important;
            min-height: 280px !important;
            border: none !important;
            background-color: #000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
          }
          #${containerId} video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          #${containerId} canvas {
            display: none !important;
          }
          #${containerId}__scan_region {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        `}</style>

        {/* Cabecera del Escáner */}
        {!inline && (
          <header className="px-5 py-3.5 border-b-2 border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground uppercase tracking-tight m-0">
                  {title}
                </h2>
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  {subtitle || 'Visor de Cámara en Tiempo Real'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground h-9 px-2.5 font-bold"
            >
              <X className="w-5 h-5 mr-1" />
              Cerrar
            </Button>
          </header>
        )}

        {/* Banner Informativo de QR Esperado (FIFO) */}
        {expectedCode && (
          <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-blue-500 shadow-xs shrink-0">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <History className="w-4 h-4 text-blue-200" />
              Saco Esperado en Piso (FIFO):
            </span>
            <span className="font-mono bg-blue-950/70 border border-blue-300/40 text-blue-100 px-2.5 py-0.5 rounded text-xs tracking-wider">
              {expectedCode}
            </span>
          </div>
        )}

        {/* Contenedor del Visor de Cámara */}
        <div className="relative w-full aspect-square sm:aspect-4/3 bg-black overflow-hidden flex items-center justify-center">
          {/* DIV donde se monta el stream de video de Html5Qrcode */}
          <div id={containerId} className="w-full h-full" />

          {/* Estado de Carga / Inicialización */}
          {isInitializing && !cameraError && (
            <div className="absolute inset-0 bg-background/90 z-20 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <RefreshCw className="w-9 h-9 text-primary animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Iniciando Cámara...</p>
                <p className="text-xs text-muted-foreground">
                  Solicitando acceso al sensor de video del dispositivo.
                </p>
              </div>
            </div>
          )}

          {/* Estado de Error de Cámara */}
          {cameraError && (
            <div className="absolute inset-0 bg-background/95 z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="p-3 bg-destructive/10 text-destructive rounded-full">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-black text-foreground">No se pudo activar la cámara</p>
                <p className="text-xs font-medium text-muted-foreground">{cameraError}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => startCamera(activeCameraId)}
                  className="font-bold text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reintentar Cámara
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowManualInput(true)}
                  className="font-bold text-xs"
                >
                  <Keyboard className="w-3.5 h-3.5 mr-1.5" />
                  Entrada Manual
                </Button>
              </div>
            </div>
          )}

          {/* Mira de Escaneo Industrial Superpuesta */}
          {!isInitializing && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
              {/* Recuadro de Enfoque con Esquinas */}
              <div className="w-[68%] aspect-square relative border-2 border-primary/40 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Esquinas Marcadas */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />

                {/* Línea Láser Animada */}
                <div className="w-full h-0.5 bg-primary shadow-[0_0_8px_#3b82f6] absolute top-1/2 -translate-y-1/2 animate-pulse" />
              </div>

              <div className="mt-4 px-3 py-1 bg-black/70 backdrop-blur-xs rounded-full border border-white/20">
                <p className="text-[11px] font-bold text-white tracking-wide uppercase">
                  Alinea el código QR dentro del recuadro
                </p>
              </div>
            </div>
          )}

          {/* Botón Flotante para Cambiar de Cámara (si hay más de una) */}
          {cameras.length > 1 && !cameraError && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="absolute top-3 right-3 z-30 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/20 shadow-md transition-all active:scale-95"
              title="Cambiar de Cámara"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra Inferior: Alternancia de Entrada Manual / Pistola USB */}
        <div className="p-3.5 bg-card border-t border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              Escaneo con Pistola USB / Teclado
            </span>
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              {showManualInput ? 'Ocultar teclado' : 'Escribir código'}
            </button>
          </div>

          {(showManualInput || cameraError) && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                autoFocus
                placeholder="Escribe o pistolea el código QR..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="font-mono uppercase font-bold text-xs h-10 border-2"
              />
              <Button
                type="submit"
                disabled={!manualInput.trim()}
                className="font-bold text-xs h-10 px-4 bg-primary text-primary-foreground shrink-0"
              >
                <Check className="w-4 h-4 mr-1" />
                Ingresar
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (!inline && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};
