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
import { SuperAdminAuth } from './features/super-admin/components/SuperAdminAuth';
import { SuperAdminDashboard } from './features/super-admin/components/SuperAdminDashboard';
import { SuperAdminGuard } from './features/super-admin/components/SuperAdminGuard';
import { subscribeToPrintQueueRealtime, fetchPendingFlejes } from './services/supabase/printQueueRealtime.service';
import { supabase } from './lib/supabase';
import { usePrintQueueStore } from './stores/usePrintQueueStore';
import { useTenantStore } from './stores/useTenantStore';
import { DesktopStationAuth } from './features/settings/components/DesktopStationAuth';
import { Sparkles, CheckCircle2, Send } from 'lucide-react';

export const App: React.FC = () => {
  const { addItem, setQueue, queue } = usePrintQueueStore();
  const {
    currentBranchId,
    currentOrganizationId,
    setCurrentBranch,
    setCurrentOrganization,
    setWhiteLabelName,
  } = useTenantStore();
  const [suspendedNotice, setSuspendedNotice] = useState<string | null>(null);

  const totalFlejesEnCola = queue.reduce(
    (acc, it) => acc + (it.cantidad ?? it.quantity ?? 1),
    0
  );

  const [activeTab, setActiveTab] = useState<'form' | 'queue'>('form');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPasilloModalOpen, setIsPasilloModalOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);

  // Detección inicial inteligente: Móvil (< 768px o User Agent) o ruta /repositor, o /super-admin
  const [viewMode, setViewMode] = useState<
    'desktop' | 'repositor' | 'pasillo' | 'super-admin' | 'super-admin-dashboard'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();

      // 0. Rutas de SuperAdmin
      if (path === '/super-admin/dashboard' || path.startsWith('/super-admin/dashboard')) {
        return 'super-admin-dashboard';
      }
      if (path === '/super-admin' || path.startsWith('/super-admin') || params.has('super-admin')) {
        return 'super-admin';
      }

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

  const navigateTo = (
    path: string,
    newMode: 'desktop' | 'repositor' | 'pasillo' | 'super-admin' | 'super-admin-dashboard'
  ) => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({ path }, '', path);
    }
    setViewMode(newMode);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/super-admin/dashboard' || path.startsWith('/super-admin/dashboard')) {
        setViewMode('super-admin-dashboard');
      } else if (path === '/super-admin' || path.startsWith('/super-admin')) {
        setViewMode('super-admin');
      } else if (path.includes('/repositor')) {
        setViewMode('repositor');
      } else if (path.includes('/pasillo')) {
        setViewMode('pasillo');
      } else {
        setViewMode('desktop');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Suscripción y Consulta en Tiempo Real para la sucursal activa en Desktop
  useEffect(() => {
    if (viewMode !== 'desktop' || !currentBranchId) return;

    // 1. Carga inicial de flejes pendientes de la sucursal activa
    let isCancelled = false;
    const loadBranchQueue = async () => {
      try {
        const branchFlejes = await fetchPendingFlejes(currentBranchId);
        if (!isCancelled && branchFlejes && branchFlejes.length > 0) {
          setQueue(branchFlejes);
        }
      } catch (err) {
        console.error("Error al cargar cola inicial de la sucursal:", err);
      }
    };
    loadBranchQueue();

    // 2. Suscripción Realtime blindada para la sucursal activa
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
    }, currentBranchId);

    return () => {
      isCancelled = true;
      unsubFlejes();
    };
  }, [addItem, setQueue, viewMode, currentBranchId]);

  // Verificación estricta de suscripción y pago activo para la estación vinculada
  useEffect(() => {
    if (viewMode !== 'desktop' || !currentBranchId) return;

    let isSubscribed = true;

    const checkSubscriptionPaywall = async () => {
      try {
        let orgId = currentOrganizationId;
        if (!orgId) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('organization_id')
            .eq('id', currentBranchId)
            .maybeSingle();
          if (branchData?.organization_id) {
            orgId = branchData.organization_id;
          }
        }

        if (orgId) {
          const { data: orgData, error } = await supabase
            .from('organizations')
            .select('id, name, subscription_status, next_billing_date')
            .eq('id', orgId)
            .maybeSingle();

          if (error) {
            console.error("Error al validar suscripción:", error);
            return;
          }

          if (orgData && isSubscribed) {
            const isStatusActive = orgData.subscription_status === 'active';
            let isDateValid = true;
            if (orgData.next_billing_date) {
              const cleanDate = String(orgData.next_billing_date).split('T')[0];
              const parts = cleanDate.split('-');
              if (parts.length === 3) {
                const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
                isDateValid = dueDate.getTime() >= Date.now();
              }
            }

            if (!isStatusActive || !isDateValid) {
              // Desvincular terminal inmediatamente por falta de pago / suspensión
              setCurrentBranch(null);
              setCurrentOrganization(null);
              setWhiteLabelName(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('current_branch_id');
                localStorage.removeItem('current_organization_id');
                localStorage.removeItem('white_label_name');
                localStorage.removeItem('whiteLabelName');
                localStorage.removeItem('branch_name');
                localStorage.removeItem('branch_address');
                localStorage.removeItem('organization_name');
              }
              setSuspendedNotice(
                `Servicio Suspendido (${orgData.name}): Este comercio registra una suspensión temporal por falta de pago. Contacte a administración para reactivar.`
              );
            }
          }
        }
      } catch (err) {
        console.error("Error al comprobar estado de la suscripción:", err);
      }
    };

    checkSubscriptionPaywall();

    // Revalidar periódicamente cada 10 segundos y al reenfocar la ventana
    const interval = setInterval(checkSubscriptionPaywall, 10000);
    const onFocus = () => {
      checkSubscriptionPaywall();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [viewMode, currentBranchId, currentOrganizationId, setCurrentBranch, setCurrentOrganization, setWhiteLabelName]);

  // Vista SuperAdmin: Login
  if (viewMode === 'super-admin') {
    return (
      <SuperAdminAuth
        onLoginSuccess={() => navigateTo('/super-admin/dashboard', 'super-admin-dashboard')}
      />
    );
  }

  // Vista SuperAdmin: Dashboard (Protegida por SuperAdminGuard)
  if (viewMode === 'super-admin-dashboard') {
    return (
      <SuperAdminGuard onUnauthorized={() => navigateTo('/super-admin', 'super-admin')}>
        <SuperAdminDashboard
          onLogout={() => navigateTo('/super-admin', 'super-admin')}
        />
      </SuperAdminGuard>
    );
  }

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

  // Vista de Escritorio: Si no hay sucursal enlazada al terminal, mostrar Selector de Estación
  if (!currentBranchId) {
    return (
      <DesktopStationAuth
        initialAlertMessage={suspendedNotice}
        onStationLinked={() => setSuspendedNotice(null)}
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
        onDisconnectStation={() => {
          setCurrentBranch(null);
          setCurrentOrganization(null);
          setWhiteLabelName(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('current_branch_id');
            localStorage.removeItem('current_organization_id');
            localStorage.removeItem('white_label_name');
            localStorage.removeItem('whiteLabelName');
            localStorage.removeItem('branch_name');
            localStorage.removeItem('branch_address');
            localStorage.removeItem('organization_name');
            window.location.href = '/';
          }
        }}
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
          {/* Selector de Pestañas (Tabs) */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950 p-2 gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('form')}
              className={`w-1/2 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'form'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>📝 Cargar Fleje</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`w-1/2 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>🖨️ Cola de Impresión</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  activeTab === 'queue'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {totalFlejesEnCola}
              </span>
            </button>
          </div>

          {/* Contenedor Condicional con Scroll */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col">
            {activeTab === 'form' ? (
              <FastInputForm />
            ) : (
              <QueueManager />
            )}
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
