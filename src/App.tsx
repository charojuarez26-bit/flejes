import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { FastInputForm } from './features/fast-input/components/FastInputForm';
import { QueueManager } from './features/print-queue/components/QueueManager';
import { PrintPreviewCanvas } from './features/print-engine/components/PrintPreviewCanvas';
import { BulkImportModal } from './features/bulk-import/components/BulkImportModal';
import { ScannerModal } from './components/modals/ScannerModal';
import { ConfigModal } from './components/modals/ConfigModal';
import { SupportModal } from './features/credits/components/SupportModal';
import { PasilloConnectModal } from './components/modals/PasilloConnectModal';
import { HistorialPrecios } from './components/modals/HistorialPrecios';
import { MobileScanner } from './features/mobile-scanner/components/MobileScanner';
import { MobileEntry } from './features/mobile-scanner/components/MobileEntry';
import { subscribeToPrintQueueRealtime } from './services/supabase/printQueueRealtime.service';
import { usePrintQueueStore } from './stores/usePrintQueueStore';
import { Sparkles, CheckCircle2, Send } from 'lucide-react';

export const App: React.FC = () => {
  const { addItem } = usePrintQueueStore();

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPasilloModalOpen, setIsPasilloModalOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);

  // Detección inicial inteligente: Móvil (< 768px o User Agent) o ruta /repositor
  const [viewMode, setViewMode] = useState<'desktop' | 'repositor' | 'pasillo'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();

      // 1. Rutas o parámetros explícitos
      if (params.has('repositor') || params.has('entry') || path.includes('/repositor')) {
        return 'repositor';
      }
      if (params.has('pasillo') || params.has('mobile') || path.includes('/pasillo')) {
        return 'pasillo';
      }
      if (params.has('desktop')) {
        return 'desktop';
      }

      // 2. Detección automática para smartphones de repositores
      const isMobileScreen = window.innerWidth < 768;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      if (isMobileScreen || isMobileUA) {
        return 'repositor';
      }
    }
    return 'desktop';
  });

  // Notificación flotante de WebSocket Realtime en Desktop
  const [realtimeNotice, setRealtimeNotice] = useState<{
    title: string;
    detail: string;
    isRepositor?: boolean;
  } | null>(null);

  // Reproductor de sonido suave al recibir artículos en tiempo real
  const playArrivalSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.1); // G5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio silencioso
    }
  };

  // Suscripción en Tiempo Real vía Supabase Realtime WebSockets a flejes_pendientes (Solo en vista Desktop)
  useEffect(() => {
    if (viewMode !== 'desktop') return;

    const unsubFlejes = subscribeToPrintQueueRealtime((newItem) => {
      addItem(newItem);

      setRealtimeNotice({
        title: newItem.repositor ? `¡Artículo enviado por ${newItem.repositor}!` : '¡Artículo recibido desde el celular!',
        detail: `${newItem.product_name} • $${newItem.current_price.toLocaleString('es-AR')}`,
        isRepositor: Boolean(newItem.repositor),
      });

      playArrivalSound();

      setTimeout(() => {
        setRealtimeNotice(null);
      }, 5000);
    });

    return () => {
      unsubFlejes();
    };
  }, [addItem, viewMode]);

  // Si se entra en "Modo Repositor" (Móvil Texto Puro)
  if (viewMode === 'repositor') {
    return (
      <MobileEntry
        onBackToDesktop={() => {
          if (window.history.pushState) {
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({ path: cleanUrl }, '', cleanUrl);
          }
          setViewMode('desktop');
        }}
      />
    );
  }

  // Si se entra en "Modo Pasillo" (Móvil con Cámara y Foto)
  if (viewMode === 'pasillo') {
    return (
      <MobileScanner
        onBackToDesktop={() => {
          if (window.history.pushState) {
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({ path: cleanUrl }, '', cleanUrl);
          }
          setViewMode('desktop');
        }}
      />
    );
  }

  // Vista de Escritorio (Desktop Principal)
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Barra Superior con Marca Blanca, Importación, Historial y Modo Repositor */}
      <Navbar
        onOpenBulkImport={() => setIsBulkOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHistorial={() => setIsHistorialOpen(true)}
        onOpenRepositor={() => window.open('/repositor', '_blank')}
      />

      {/* Toast flotante de registro recibido en Tiempo Real por WebSockets */}
      {realtimeNotice && (
        <div className="fixed top-14 right-6 z-50 bg-slate-900 border border-emerald-500/80 p-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-slideDown max-w-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/30 border border-emerald-400 flex items-center justify-center flex-shrink-0 text-emerald-300">
            {realtimeNotice.isRepositor ? (
              <Send className="w-4 h-4 text-emerald-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-sky-400 animate-bounce" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
              <span>{realtimeNotice.title}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-[11px] text-emerald-300 font-bold mt-0.5 truncate">
              {realtimeNotice.detail}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Incorporado automáticamente a la tanda A4.
            </div>
          </div>
        </div>
      )}

      {/* Espacio de Trabajo Principal (Split Screen) */}
      <main className="flex-1 flex overflow-hidden print:block print:h-auto">
        {/* Mitad Izquierda: Carga Rápida, Cola y Créditos */}
        <section className="w-[490px] min-w-[420px] max-w-[550px] border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden z-10 print:hidden">
          <div className="p-3.5 flex-1 flex flex-col gap-3 overflow-hidden">
            <FastInputForm />
            <QueueManager />
          </div>

          {/* Firma Digital Permanente */}
          <footer className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400 flex-shrink-0">
            <span>Desarrollado por <strong className="text-slate-200">PM Soluciones Digitales</strong></span>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="text-sky-400 hover:text-sky-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 transition hover:bg-slate-800"
            >
              Soporte / Contacto
            </button>
          </footer>
        </section>

        {/* Mitad Derecha: Previsualización de Impresión en Vivo (A4 o Térmica) */}
        <section className="flex-1 flex overflow-hidden print:block">
          <PrintPreviewCanvas />
        </section>
      </main>

      {/* Modales */}
      <BulkImportModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />
      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <HistorialPrecios isOpen={isHistorialOpen} onClose={() => setIsHistorialOpen(false)} />
      <PasilloConnectModal
        isOpen={isPasilloModalOpen}
        onClose={() => setIsPasilloModalOpen(false)}
        onOpenLocalPasillo={() => setViewMode('pasillo')}
        onOpenLocalRepositor={() => setViewMode('repositor')}
      />
    </div>
  );
};

export default App;
