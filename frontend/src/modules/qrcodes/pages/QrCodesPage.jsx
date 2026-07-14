import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Printer, QrCode as QrIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeCanvas } from 'qrcode.react';

const QrCodesPage = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [printerFormat, setPrinterFormat] = useState('zebra'); // 'zebra' | 'a4'

  // --- ESCÁNER LOGIC ---
  useEffect(() => {
    let scanner = null;
    
    if (activeTab === 'scan') {
      setIsScanning(true);
      scanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: {width: 250, height: 250}, aspectRatio: 1.0 }, 
        /* verbose= */ false
      );
      
      scanner.render(
        (decodedText) => {
          setScanResult({ success: true, text: decodedText });
          // Opcional: pausar el escáner al leer
          scanner.pause();
        },
        (error) => {
          // Ignoramos errores de cuadros sin QR
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner. ", error));
      }
    };
  }, [activeTab]);

  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
    // Para reactivar, tendríamos que re-instanciar o si el scanner estaba pausado, resumirlo.
    // Como la limpieza es compleja por ahora forzamos re-render de la pestaña
    setActiveTab('generate');
    setTimeout(() => setActiveTab('scan'), 50);
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-10 max-w-5xl mx-auto">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 mt-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface rounded-lg border border-border shadow-sm">
            <QrIcon size={24} className="text-primary" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-text tracking-tight" style={{ color: 'var(--color-text)' }}>
            Motor de Trazabilidad QR
          </h1>
        </div>
        <p className="text-muted text-base sm:text-lg font-bold mt-1 ml-12 max-w-2xl" style={{ color: 'var(--color-muted)' }}>
          Central operativa para registrar movimientos en planta mediante escáner y emitir etiquetas de lotes.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-lg transition-colors border-b-4 ${
            activeTab === 'scan' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
          }`}
          style={{ borderColor: activeTab === 'scan' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'scan' ? 'var(--color-primary)' : 'var(--color-muted)' }}
        >
          <Camera size={20} />
          Escanear
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-lg transition-colors border-b-4 ${
            activeTab === 'generate' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
          }`}
          style={{ borderColor: activeTab === 'generate' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'generate' ? 'var(--color-primary)' : 'var(--color-muted)' }}
        >
          <Printer size={20} />
          Impresión
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === 'scan' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full"
          >
            {/* Lente */}
            <div className="glass-panel p-6 flex flex-col items-center">
              <h2 className="text-2xl font-black text-text mb-6 w-full text-left" style={{ color: 'var(--color-text)' }}>Visor Óptico</h2>
              
              <div className="w-full max-w-sm aspect-square bg-background border-4 border-dashed border-border rounded-lg overflow-hidden relative shadow-inner">
                {!scanResult ? (
                  <div id="reader" className="w-full h-full [&>div]:border-none [&_video]:object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                    <CheckCircle2 size={64} className="text-success mb-4" style={{ color: 'var(--color-success)' }} />
                    <h3 className="text-xl font-bold text-text" style={{ color: 'var(--color-text)' }}>Código Capturado</h3>
                  </div>
                )}
              </div>
              
              {scanResult && (
                <button 
                  onClick={resetScanner}
                  className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Escanear Otro Código
                </button>
              )}
            </div>

            {/* Resultados / Acciones */}
            <div className="glass-panel p-6 flex flex-col">
              <h2 className="text-2xl font-black text-text mb-6" style={{ color: 'var(--color-text)' }}>Detalle del Material</h2>
              
              {!scanResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <QrIcon size={48} className="text-muted mb-4" style={{ color: 'var(--color-muted)' }} />
                  <p className="text-lg font-bold text-text" style={{ color: 'var(--color-text)' }}>Esperando lectura...</p>
                  <p className="text-sm text-muted max-w-xs mt-2" style={{ color: 'var(--color-muted)' }}>Posiciona la etiqueta QR dentro del marco del visor para extraer su información.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-background border border-border rounded-lg shadow-inner">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted" style={{ color: 'var(--color-muted)' }}>ID Encriptado</span>
                    <p className="text-lg font-mono text-text break-all mt-1 font-bold" style={{ color: 'var(--color-text)' }}>{scanResult.text}</p>
                  </div>
                  
                  <div className="p-4 bg-surface border border-warning rounded-lg shadow-sm">
                    <h3 className="text-warning font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--color-warning)' }}>
                      <CheckCircle2 size={18} /> Validación de Sistema
                    </h3>
                    <p className="text-sm font-semibold text-text" style={{ color: 'var(--color-text)' }}>Este código corresponde a una bobina de Materia Prima lista para el área de Mezclado.</p>
                  </div>

                  <div className="mt-auto pt-6 flex gap-3">
                    <button className="flex-1 py-3 bg-success text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm" style={{ backgroundColor: 'var(--color-success)' }}>
                      Aprobar Ingreso
                    </button>
                    <button className="px-4 py-3 bg-surface border-2 border-danger text-danger font-bold rounded-lg hover:bg-danger hover:text-white transition-colors" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'generate' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 sm:p-10 min-h-[400px]"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-text" style={{ color: 'var(--color-text)' }}>Centro de Impresión</h2>
                <p className="text-muted font-bold mt-1" style={{ color: 'var(--color-muted)' }}>Genera etiquetas QR para nuevos lotes.</p>
              </div>
              
              <div className="flex items-center gap-2 bg-background p-1 rounded-md border border-border">
                <button 
                  onClick={() => setPrinterFormat('zebra')}
                  className={`px-4 py-2 rounded font-bold text-sm transition-colors ${printerFormat === 'zebra' ? 'bg-primary text-white shadow-sm' : 'text-text hover:bg-surface'}`}
                  style={{ backgroundColor: printerFormat === 'zebra' ? 'var(--color-primary)' : 'transparent', color: printerFormat === 'zebra' ? '#fff' : 'var(--color-text)' }}
                >
                  Etiqueta Térmica
                </button>
                <button 
                  onClick={() => setPrinterFormat('a4')}
                  className={`px-4 py-2 rounded font-bold text-sm transition-colors ${printerFormat === 'a4' ? 'bg-primary text-white shadow-sm' : 'text-text hover:bg-surface'}`}
                  style={{ backgroundColor: printerFormat === 'a4' ? 'var(--color-primary)' : 'transparent', color: printerFormat === 'a4' ? '#fff' : 'var(--color-text)' }}
                >
                  Hoja A4
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-text" style={{ color: 'var(--color-text)' }}>Tipo de Material</label>
                    <select className="p-3 rounded-lg bg-background border border-border text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-semibold" style={{ color: 'var(--color-text)' }}>
                      <option>Materia Prima (MP)</option>
                      <option>Material Intermedio (MI)</option>
                      <option>Producto Terminado (PT)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-text" style={{ color: 'var(--color-text)' }}>Lote Interno</label>
                    <input type="text" defaultValue="L-20260714-001" className="p-3 rounded-lg bg-background border border-border text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono font-bold" style={{ color: 'var(--color-text)' }} />
                  </div>
                </div>
                
                <button className="mt-4 py-4 bg-primary text-white font-black rounded-lg hover:opacity-90 transition-opacity shadow-sm w-full text-lg" style={{ backgroundColor: 'var(--color-primary)' }}>
                  Generar y Mandar a Imprimir
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-background border border-border rounded-lg shadow-inner">
                <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                  <QRCodeCanvas value="L-20260714-001" size={160} level="H" />
                </div>
                <span className="mt-4 font-mono font-black text-lg text-text" style={{ color: 'var(--color-text)' }}>L-20260714-001</span>
                <span className="text-xs font-bold text-muted mt-1 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Vista Previa</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};

export default QrCodesPage;