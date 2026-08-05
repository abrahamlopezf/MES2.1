import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Printer, QrCode as QrIcon, CheckCircle2, XCircle, Truck, Factory, Package, Loader2, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { useAreasQuery, useGenerateQrBatchMutation } from '../hooks/useQrQueries';
import { lookupQrCodeRequest } from '../services/qrcodesApi';

const QrCodesPage = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState(null);
  const [qrInfo, setQrInfo] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [printerFormat, setPrinterFormat] = useState('zebra'); // 'zebra' | 'a4'

  // Generación State
  const [quantity, setQuantity] = useState(1);
  const [assignedAreaId, setAssignedAreaId] = useState('');
  
  const { data: areasData, isLoading: isLoadingAreas } = useAreasQuery();
  const generateBatchMutation = useGenerateQrBatchMutation();

  const areas = areasData?.data || [];
  
  const handleGenerate = () => {
    if (!assignedAreaId || quantity < 1) return;
    
    generateBatchMutation.mutate({
      quantity: Number(quantity),
      assigned_area_id: Number(assignedAreaId)
    }, {
      onSuccess: () => {
        // Here we could open a print dialog or show a success message
        alert(`Lote de ${quantity} QRs generado exitosamente.`);
      },
      onError: (err) => {
        alert(err.response?.data?.message || 'Error al generar el lote QR');
      }
    });
  };

  const getAreaIcon = (areaName) => {
    if (!areaName) return <QrIcon size={24} className="text-black" />;
    const name = areaName.toLowerCase();
    if (name.includes('almac')) return <Truck size={24} className="text-black" />;
    if (name.includes('prod') || name.includes('mezcl')) return <Factory size={24} className="text-black" />;
    return <Package size={24} className="text-black" />;
  };

  const selectedArea = areas.find(a => a.id === Number(assignedAreaId));

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
        async (decodedText) => {
          setScanResult({ success: true, text: decodedText });
          scanner.pause();
          
          setIsLookingUp(true);
          try {
            const result = await lookupQrCodeRequest(decodedText);
            setQrInfo(result.data);
          } catch (error) {
            console.error('Error fetching QR Info', error);
            setQrInfo({ error: error.response?.data?.message || 'Error al obtener la información del QR' });
          } finally {
            setIsLookingUp(false);
          }
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
    setQrInfo(null);
    setIsScanning(true);
    // Para reactivar, tendríamos que re-instanciar o si el scanner estaba pausado, resumirlo.
    // Como la limpieza es compleja por ahora forzamos re-render de la pestaña
    setActiveTab('generate');
    setTimeout(() => setActiveTab('scan'), 50);
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-10 max-w-5xl mx-auto px-4 sm:px-8 overflow-x-hidden">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 mt-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface rounded-lg border border-border shadow-sm">
            <QrIcon size={24} className="text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Motor de Trazabilidad QR
          </h1>
        </div>
        <p className="text-muted-foreground text-base sm:text-lg font-bold mt-1 ml-12 max-w-2xl">
          Central operativa para registrar movimientos en planta mediante escáner y emitir etiquetas de lotes.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-lg transition-colors border-b-4 ${
            activeTab === 'scan' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Camera size={20} />
          Escanear
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-lg transition-colors border-b-4 ${
            activeTab === 'generate' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
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
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 flex flex-col items-center">
              <h2 className="text-2xl font-black text-foreground mb-6 w-full text-left">Visor Óptico</h2>
              
              <div className="w-full max-w-sm aspect-square bg-background border-4 border-dashed border-border rounded-lg overflow-hidden relative shadow-inner">
                {!scanResult ? (
                  <div id="reader" className="w-full h-full [&>div]:border-none [&_video]:object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                    <CheckCircle2 size={64} className="text-success mb-4" />
                    <h3 className="text-xl font-bold text-foreground">Código Capturado</h3>
                  </div>
                )}
              </div>
              
              {scanResult && (
                <button 
                  onClick={resetScanner}
                  className="mt-6 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                >
                  Escanear Otro Código
                </button>
              )}
            </div>

            {/* Resultados / Acciones */}
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 flex flex-col">
              <h2 className="text-2xl font-black text-foreground mb-6">Detalle del Material</h2>
              
              {!scanResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <QrIcon size={48} className="text-muted-foreground mb-4" />
                  <p className="text-lg font-bold text-foreground">Esperando lectura...</p>
                  <p className="text-sm text-muted-foreground max-w-xs mt-2">Posiciona la etiqueta QR dentro del marco del visor para extraer su información.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-background border border-border rounded-lg shadow-inner">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código Físico QR</span>
                    <p className="text-lg font-mono text-foreground break-all mt-1 font-bold">{scanResult.text}</p>
                  </div>
                  
                  {isLookingUp ? (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                      <Loader2 className="animate-spin mb-2" size={32} />
                      <span className="font-bold">Buscando información...</span>
                    </div>
                  ) : qrInfo?.error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                      <h3 className="text-red-600 font-bold flex items-center gap-2 mb-2">
                        <XCircle size={18} /> Error de Búsqueda
                      </h3>
                      <p className="text-sm font-semibold text-red-800">{qrInfo.error}</p>
                    </div>
                  ) : qrInfo ? (
                    <>
                      <div className="p-4 bg-surface border border-primary/30 rounded-lg shadow-sm">
                        <h3 className="text-primary font-bold flex items-center gap-2 mb-2">
                          <CheckCircle2 size={18} /> Historial de Lote QR
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <span className="font-semibold text-muted-foreground">Estado:</span>
                          <span className="font-bold text-foreground">{qrInfo.status}</span>
                          <span className="font-semibold text-muted-foreground">Área:</span>
                          <span className="font-bold text-foreground">{qrInfo.area_name || 'N/A'}</span>
                        </div>
                      </div>

                      {qrInfo.reception ? (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                          <h3 className="text-blue-700 font-bold flex items-center gap-2 mb-2">
                            <Package size={18} /> Recepción de Inventario
                          </h3>
                          <div className="grid grid-cols-1 gap-2 text-sm mt-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-blue-600/70 text-xs uppercase tracking-wider">Tracking Code Extendido</span>
                              <span className="font-black text-blue-900 font-mono text-base break-all">{qrInfo.reception.tracking_code || 'No asignado'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <span className="font-semibold text-blue-800/70">Material:</span>
                              <span className="font-bold text-blue-900">{qrInfo.reception.material_code}</span>
                              <span className="font-semibold text-blue-800/70">Cantidad:</span>
                              <span className="font-bold text-blue-900">{qrInfo.reception.quantity}</span>
                              <span className="font-semibold text-blue-800/70">Ubicación:</span>
                              <span className="font-bold text-blue-900">{qrInfo.reception.location}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
                          <h3 className="text-orange-700 font-bold flex items-center gap-2 mb-2">
                            <AlertCircle size={18} /> Etiqueta sin Recibir
                          </h3>
                          <p className="text-sm font-semibold text-orange-900">Esta etiqueta aún no ha sido utilizada para dar entrada a material en el sistema.</p>
                        </div>
                      )}
                    </>
                  ) : null}

                  <div className="mt-auto pt-6 flex gap-3">
                    <button onClick={resetScanner} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                      Escanear Nuevo Código
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
            className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 sm:p-10 min-h-[400px]"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-foreground">Centro de Impresión</h2>
                <p className="text-muted-foreground font-bold mt-1">Genera etiquetas QR para nuevos lotes.</p>
              </div>
              
              <div className="flex items-center gap-2 bg-background p-1 rounded-md border border-border">
                <button 
                  onClick={() => setPrinterFormat('zebra')}
                  className={`px-4 py-2 rounded font-bold text-sm transition-colors ${printerFormat === 'zebra' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                >
                  Etiqueta Térmica
                </button>
                <button 
                  onClick={() => setPrinterFormat('a4')}
                  className={`px-4 py-2 rounded font-bold text-sm transition-colors ${printerFormat === 'a4' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}
                >
                  Hoja A4
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-foreground">Área Asignada</label>
                    <select 
                      value={assignedAreaId}
                      onChange={(e) => setAssignedAreaId(e.target.value)}
                      className="p-3 rounded-lg bg-background border border-border text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-semibold"
                    >
                      <option value="">Selecciona un área...</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-foreground">Cantidad de Etiquetas</label>
                    <input 
                      type="number" 
                      min="1"
                      max="1000"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="p-3 rounded-lg bg-background border border-border text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono font-bold" 
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerate}
                  disabled={!assignedAreaId || generateBatchMutation.isPending}
                  className="mt-4 py-4 bg-primary text-primary-foreground font-black rounded-lg hover:opacity-90 transition-opacity shadow-sm w-full text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generateBatchMutation.isPending && <Loader2 size={20} className="animate-spin" />}
                  Generar y Mandar a Imprimir
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-background border border-border rounded-lg shadow-inner">
                <div className="bg-card p-4 rounded-md shadow-sm border border-border relative">
                  <QRCodeCanvas value="VISTA-PREVIA-001" size={160} level="H" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-sm flex items-center justify-center shadow-sm">
                      {getAreaIcon(selectedArea?.name)}
                    </div>
                  </div>
                </div>
                <span className="mt-4 font-mono font-black text-lg text-foreground">VISTA-PREVIA-001</span>
                <span className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wider">Vista Previa</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};

export default QrCodesPage;