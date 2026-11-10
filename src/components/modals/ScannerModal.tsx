import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { usePrintQueueStore } from '../../stores/usePrintQueueStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { fetchProductByBarcode } from '../../services/supabase/products.service';
import { X, Camera, CheckCircle2, AlertTriangle, Volume2 } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScannedEntry {
  name: string;
  price: number;
  barcode: string;
  timestamp: string;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose }) => {
  const { addItem } = usePrintQueueStore();
  const { organization, activeBranchId } = useTenantStore();

  const [recentScans, setRecentScans] = useState<ScannedEntry[]>([]);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastBarcodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-camera-stream',
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.5,
          },
          false
        );

        scanner.render(
          async (decodedText) => {
            const now = Date.now();
            // Debounce: evitar lecturas duplicadas en menos de 1.8 segundos del mismo código
            if (decodedText === lastBarcodeRef.current && now - lastScanTimeRef.current < 1800) {
              return;
            }

            lastBarcodeRef.current = decodedText;
            lastScanTimeRef.current = now;
            setIsProcessing(true);

            // 1. Audio Beep & Vibración háptica en smartphones
            try {
              if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(950, audioCtx.currentTime);
              osc.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.12);
            } catch {
              // Ignore audio context errors
            }

            // 2. Consultar producto a Supabase / Catálogo
            const product = await fetchProductByBarcode(decodedText, organization.id, activeBranchId);

            // 3. Agregar a la cola de impresión de Zustand
            addItem(product);

            // 4. Actualizar lista de escaneos recientes
            setRecentScans((prev) => [
              {
                name: product.product_name,
                price: product.current_price,
                barcode: decodedText,
                timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
              ...prev.slice(0, 4), // Guardar los últimos 5
            ]);

            setIsProcessing(false);
          },
          () => {
            // Callback continuo de búsqueda de frames
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        setScannerError(err.message || 'No se pudo inicializar la cámara');
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, organization.id, activeBranchId, addItem]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Modo Escáner Móvil</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">EN VIVO</span>
              </h2>
              <p className="text-[11px] text-slate-400">Apunta al código EAN-13 del producto en góndola</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-4 flex flex-col items-center flex-1 overflow-y-auto">
          <div
            id="qr-camera-stream"
            className="w-full rounded-xl overflow-hidden border-2 border-slate-700 bg-black shadow-inner"
          />

          {scannerError && (
            <div className="mt-3 p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-300 w-full">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Feedback inmediato de escaneo */}
          {recentScans.length > 0 && (
            <div className="w-full mt-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>Últimos Artículos Agregados a la Cola:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  <span>{recentScans.length} en sesión</span>
                </span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {recentScans.map((item, idx) => (
                  <div
                    key={`${item.barcode}-${idx}`}
                    className={`p-2.5 rounded-lg border flex items-center justify-between transition ${
                      idx === 0
                        ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-100 shadow-sm animate-pulse'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.barcode} • {item.timestamp}</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-400 flex-shrink-0">
                      ${item.price.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-between items-center bg-slate-900/90 text-xs">
          <span className="text-slate-400">
            {isProcessing ? 'Buscando en Supabase...' : 'Listo para escanear'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-xl transition shadow-md shadow-blue-600/30"
          >
            Listo / Ver Cola
          </button>
        </div>
      </div>
    </div>
  );
};
