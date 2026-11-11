import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Send, CheckCircle2, RotateCcw, AlertTriangle, ArrowLeft, Barcode, DollarSign, User } from 'lucide-react';
import { uploadFotoFleje, crearFlejePendiente } from '../../../services/supabase/relevamiento.service';
import { useTenantStore } from '../../../stores/useTenantStore';

interface MobileScannerProps {
  onBackToDesktop?: () => void;
}

export const MobileScanner: React.FC<MobileScannerProps> = ({ onBackToDesktop }) => {
  const { tradeName, brandColor, branches, activeBranchId } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [surveyCount, setSurveyCount] = useState(0);

  // Nombre del repositor con persistencia en localStorage
  const [repositor, setRepositor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('repositor_nombre') || '';
    }
    return '';
  });

  const handleRepositorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRepositor(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('repositor_nombre', val);
    }
  };

  // Manejador de captura de foto con la cámara nativa
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
      setErrorMessage(null);
    }
  };

  const handleRetakePhoto = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Sonido de confirmación con Web Audio API
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio silencioso en entornos restringidos
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanBarcode = barcode.trim();
    const numericPrice = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'));

    if (!cleanBarcode) {
      setErrorMessage('Por favor ingresa o escanea el código de barras');
      return;
    }

    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMessage('Por favor ingresa un precio válido mayor a 0');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Subir fotografía al Storage (o Data URL fallback)
      let uploadedUrl: string | null = null;
      if (selectedFile) {
        uploadedUrl = await uploadFotoFleje(selectedFile);
      }

      // 2. Insertar en base de datos 'flejes_pendientes' y emitir Realtime
      await crearFlejePendiente({
        codigo_barra: cleanBarcode,
        precio_nuevo: numericPrice,
        foto_url: uploadedUrl,
        repositor: repositor.trim() || null,
        branch_id: activeBranch?.id,
      });

      // Feedback háptico en móviles
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 80, 60]);
      }
      playSuccessSound();

      // Feedback visual
      setSuccessMessage(`¡Fleje $${numericPrice.toLocaleString('es-AR')} enviado a la PC!`);
      setSurveyCount((prev) => prev + 1);

      // Limpiar formulario para el próximo artículo
      setSelectedFile(null);
      setPhotoPreview(null);
      setBarcode('');
      setPrice('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Desvanecer el mensaje de éxito tras 3 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al enviar';
      setErrorMessage(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Header Móvil */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {onBackToDesktop && (
            <button
              onClick={onBackToDesktop}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Volver a la vista PC"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-100">
              {tradeName}
            </h1>
            <p className="text-[10px] text-emerald-400 font-semibold">
              Modo Pasillo • {activeBranch?.name || 'Sucursal Principal'}
            </p>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
          <span>Relevados:</span>
          <span className="bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">
            {surveyCount}
          </span>
        </div>
      </header>

      {/* Input de archivo nativo oculto para la cámara */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        id="cameraCaptureInput"
      />

      {/* Contenido principal scrolleable */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Banner de Éxito Rápido */}
        {successMessage && (
          <div className="bg-emerald-950/80 border border-emerald-600/70 p-3 rounded-xl flex items-center gap-3 text-emerald-200 animate-slideDown shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
            <div className="text-xs font-bold leading-tight">
              {successMessage}
            </div>
          </div>
        )}

        {/* Banner de Error */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-600/70 p-3 rounded-xl flex items-center gap-3 text-rose-200 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Zona de Cámara / Previsualización de Foto */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Foto de Góndola / Fleje</span>
            {photoPreview && (
              <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Foto capturada
              </span>
            )}
          </label>

          {!photoPreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-900/60 active:bg-slate-900 flex flex-col items-center justify-center gap-2.5 text-slate-400 transition group p-4"
            >
              <div className="w-14 h-14 rounded-full bg-sky-950/70 border border-sky-600/50 flex items-center justify-center text-sky-400 group-hover:scale-105 transition shadow-inner">
                <Camera className="w-7 h-7" />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-slate-200">
                  Tocar para Abrir Cámara
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Apunta a la etiqueta de góndola o producto
                </div>
              </div>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 group shadow-lg">
              <img
                src={photoPreview}
                alt="Foto capturada"
                className="w-full h-48 object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  Lista para enviar
                </span>
                <button
                  type="button"
                  onClick={handleRetakePhoto}
                  className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-600 backdrop-blur-sm shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retomar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Formulario de Entrada */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tu Nombre (Repositor) con Persistencia LocalStorage */}
          <div className="flex flex-col gap-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                <span>Tu Nombre (Repositor)</span>
              </span>
              {repositor.trim() && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Recordado
                </span>
              )}
            </label>
            <input
              type="text"
              value={repositor}
              onChange={handleRepositorChange}
              placeholder="Ej: Carlos Gómez"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
              autoComplete="name"
            />
          </div>

          {/* Código de Barras */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span>Código de Barras (EAN-13)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="7790040123456"
                className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-lg font-mono font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 shadow-inner"
                autoComplete="off"
              />
              {barcode && (
                <button
                  type="button"
                  onClick={() => setBarcode('')}
                  className="absolute right-3 top-3.5 text-xs text-slate-500 hover:text-slate-300 font-bold px-1.5 py-0.5 rounded bg-slate-800"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>

          {/* Precio Nuevo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Precio Nuevo en Góndola</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-2xl font-black text-emerald-400 select-none">
                $
              </span>
              <input
                type="text"
                inputMode="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1500"
                className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-2xl font-black text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>
          </div>

          {/* Botón Enviar */}
          <button
            type="submit"
            disabled={isSubmitting || !barcode || !price}
            className="w-full mt-2 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] shadow-lg shadow-emerald-600/30"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transmitiendo a PC...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Enviar a PC en Tiempo Real</span>
              </>
            )}
          </button>
        </form>

        {/* Tip informativo para el repositor */}
        <div className="mt-auto pt-4 text-center text-[11px] text-slate-500">
          La foto y el precio aparecerán al instante en la pantalla de la PC para que el operador complete la tanda de impresión A4.
        </div>
      </main>
    </div>
  );
};

export default MobileScanner;
