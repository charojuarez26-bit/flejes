import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { usePrintQueueStore } from '../../../stores/usePrintQueueStore';
import { useTenantStore } from '../../../stores/useTenantStore';
import { X, Camera, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({ isOpen, onClose }) => {
  const { addItem } = usePrintQueueStore();
  const { organization, activeBranchId } = useTenantStore();

  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            // Éxito al escanear código de barras
            setLastScanned(decodedText);
            setScanCount((prev) => prev + 1);

            // Audio beep suave
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(800, audioCtx.currentTime);
              osc.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.1);
            } catch {
              // Ignore audio errors
            }

            // Agregar a la cola de la sucursal
            addItem({
              organization_id: organization.id,
              branch_id: activeBranchId,
              product_id: `prod-scanned-${Date.now()}`,
              product_name: `Artículo Escaneado (${decodedText.slice(-4)})`,
              barcode: decodedText,
              current_price: 990, // Precio base de prueba
              promo_type: 'none',
              quantity: 1,
              source: 'scanner_mobile',
              preferred_mode: 'a4_sheet',
            });
          },
          () => {
            // Ignore frame decode errors
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        setScannerError(err.message || 'No se pudo acceder a la cámara');
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Escáner Móvil de Góndola</h2>
              <p className="text-xs text-slate-400">Apunta al código de barras del producto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Scanner Area */}
        <div className="p-4 flex flex-col items-center">
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden border border-slate-700 bg-black" />

          {scannerError && (
            <div className="mt-3 p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-300 w-full">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {lastScanned && (
            <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl w-full flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-300">¡Código Agregado a la Cola!</div>
                  <div className="text-[11px] font-mono text-slate-400">{lastScanned}</div>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-800/60 text-emerald-200 px-2.5 py-1 rounded-full">
                {scanCount} escaneados
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-between items-center bg-slate-900/80 text-xs">
          <span className="text-slate-400">Total en cola móvil: <strong className="text-slate-200">{scanCount}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-lg transition shadow-md shadow-blue-600/30"
          >
            Listo / Ver Cola
          </button>
        </div>
      </div>
    </div>
  );
};
