import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, ArrowLeft, ShoppingCart, DollarSign, Package, Tag, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { insertMobileEntry } from '../../../services/supabase/printQueueRealtime.service';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../stores/useTenantStore';
import { parseQuantityDeal } from '../../../utils/priceParser';
import { RepositorPinLogin } from './RepositorPinLogin';

interface MobileEntryProps {
  onBackToDesktop?: () => void;
}

export const MobileEntry: React.FC<MobileEntryProps> = ({ onBackToDesktop }) => {
  const {
    tradeName,
    brandColor,
    branches,
    activeBranchId,
    currentOrganizationId,
    currentBranchId,
    currentRepositor,
    setCurrentRepositor,
    setCurrentBranch,
    setCurrentOrganization,
    setWhiteLabelName,
  } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [previousPrice, setPreviousPrice] = useState('');
  const [boxQuantity, setBoxQuantity] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedOrgName, setSuspendedOrgName] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Historial local de la sesión móvil
  const [recentItems, setRecentItems] = useState<Array<{ name: string; price: number }>>([]);

  // Guardián de Estado Activo al montar el componente
  const verifyOrgStatus = async () => {
    let orgId = currentOrganizationId;
    if (!orgId && typeof window !== 'undefined') {
      orgId = localStorage.getItem('current_organization_id');
    }
    if (!orgId) {
      const branchId = currentBranchId || (typeof window !== 'undefined' ? localStorage.getItem('current_branch_id') : null);
      if (branchId) {
        const { data: bData } = await supabase
          .from('branches')
          .select('organization_id')
          .eq('id', branchId)
          .maybeSingle();
        if (bData?.organization_id) {
          orgId = bData.organization_id;
        }
      }
    }

    if (!orgId) return;

    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, subscription_status, next_billing_date')
        .eq('id', orgId)
        .maybeSingle();

      if (error) {
        console.error("Error verificando estado de organización:", error);
        return;
      }

      if (data) {
        let isBillingCurrent = true;
        if (data.next_billing_date) {
          const cleanDate = String(data.next_billing_date).split('T')[0];
          const parts = cleanDate.split('-');
          if (parts.length === 3) {
            const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
            isBillingCurrent = dueDate.getTime() >= Date.now();
          }
        }

        if (data.subscription_status !== 'active' || !isBillingCurrent) {
          // Limpiar inmediatamente localStorage y Zustand
          if (typeof window !== 'undefined') {
            localStorage.removeItem('current_repositor');
            localStorage.removeItem('repositor_nombre');
            localStorage.removeItem('repositorName');
            localStorage.removeItem('current_organization_id');
            localStorage.removeItem('current_branch_id');
            localStorage.removeItem('white_label_name');
            localStorage.removeItem('whiteLabelName');
            localStorage.removeItem('branch_name');
            localStorage.removeItem('organization_name');
          }
          setCurrentRepositor(null);
          setCurrentBranch(null);
          setCurrentOrganization(null);
          setWhiteLabelName(null);
          setSuspendedOrgName(data.name || 'Este comercio');
          setIsSuspended(true);
        } else {
          setIsSuspended(false);
        }
      }
    } catch (err) {
      console.error("Error comprobando estado de organización:", err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    verifyOrgStatus();
  }, [currentOrganizationId, currentBranchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const deal = parseQuantityDeal(currentPrice);
    const parsedCurrentPrice = deal
      ? deal.totalPrice
      : parseFloat(currentPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
    const parsedPreviousPrice = previousPrice.trim()
      ? parseFloat(previousPrice.replace(/[^0-9.,]/g, '').replace(',', '.'))
      : null;

    if (!trimmedName) {
      setErrorMessage('Por favor ingresa el nombre del producto');
      nameInputRef.current?.focus();
      return;
    }

    if (isNaN(parsedCurrentPrice) || parsedCurrentPrice <= 0) {
      setErrorMessage('Por favor ingresa un precio actual válido');
      return;
    }

    setIsSubmitting(true);

    try {
      const repositorName = currentRepositor?.name || 'Repositor';

      await insertMobileEntry({
        name: trimmedName,
        current_price: parsedCurrentPrice,
        previous_price: parsedPreviousPrice && !isNaN(parsedPreviousPrice) ? parsedPreviousPrice : null,
        box_quantity: boxQuantity.trim() || null,
        price_raw: deal ? currentPrice.trim() : null,
        repositor: repositorName,
        repositor_id: currentRepositor?.id || null,
        organization_id: currentOrganizationId ?? null,
        branch_id: currentBranchId ?? activeBranch?.id ?? null,
      });

      // Feedback háptico
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 60, 40]);
      }

      // Audio feedback suave
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch {
        // Audio silencioso
      }

      // Feedback visual rápido
      setSuccessToast(`¡Artículo "${trimmedName}" enviado a PC!`);
      setSentCount((prev) => prev + 1);
      setRecentItems((prev) => [{ name: trimmedName, price: parsedCurrentPrice }, ...prev.slice(0, 4)]);

      // Limpiar formulario
      setName('');
      setCurrentPrice('');
      setPreviousPrice('');
      setBoxQuantity('');

      // Desvanecer toast y reenfocar
      setTimeout(() => {
        setSuccessToast(null);
      }, 3000);

      nameInputRef.current?.focus();
    } catch (err: unknown) {
      console.error("Error en Supabase:", err);
      const msg = err instanceof Error ? err.message : 'Error al enviar artículo';
      if (msg.includes('cuenta suspendida') || msg.includes('Acción bloqueada') || msg.toLowerCase().includes('suspendid')) {
        setErrorMessage('Acción bloqueada: cuenta suspendida');
        setIsSuspended(true);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_repositor');
      localStorage.removeItem('repositor_nombre');
      localStorage.removeItem('repositorName');
    }
    setCurrentRepositor(null);
  };

  // Pantalla bloqueante de Servicio Suspendido
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none antialiased">
        <div className="w-full max-w-sm bg-slate-900 border border-rose-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-5 shadow-inner">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Servicio Suspendido
          </h2>
          <p className="text-xs text-rose-200/90 leading-relaxed mb-6 font-medium">
            {suspendedOrgName ? `"${suspendedOrgName}": ` : ''}
            Este comercio registra una suspensión temporal por falta de pago. Contacte a administración para reactivar.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={() => {
                verifyOrgStatus();
              }}
              disabled={isCheckingStatus}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-950/60 disabled:opacity-50"
            >
              {isCheckingStatus ? (
                <span>Comprobando estado...</span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Reintentar</span>
                </>
              )}
            </button>

            {onBackToDesktop && (
              <button
                onClick={onBackToDesktop}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Volver a la PC
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Si el repositor aún no se autenticó por PIN, mostrar pantalla de PIN
  if (!currentRepositor) {
    return (
      <RepositorPinLogin
        onSuccess={() => {}}
        onBackToDesktop={onBackToDesktop}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Barra Superior Móvil */}
      <header className="w-full px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        {/* Contenedor Izquierdo: Información del Comercio y Operador */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBackToDesktop && (
            <button
              onClick={onBackToDesktop}
              className="p-1 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex-shrink-0"
              title="Volver a la PC"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div
            className="w-2.5 h-2.5 rounded-full shadow flex-shrink-0"
            style={{ backgroundColor: brandColor }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-100 truncate">
              {tradeName}
            </h1>
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <span className="text-indigo-300 font-medium whitespace-nowrap">
                Op: <span className="font-semibold text-white">{currentRepositor.name}</span>
              </span>
              <span>•</span>
              <span className="truncate">{activeBranch?.name || 'Casa Central'}</span>
            </p>
          </div>
        </div>

        {/* Contenedor Derecho: Contador y Botón Salir */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold text-sky-400 flex items-center gap-1 shadow-sm flex-shrink-0">
            <span>Env:</span>
            <span className="bg-sky-500 text-slate-950 px-1 py-0.2 rounded-full font-black text-[10px]">
              {sentCount}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex-shrink-0 whitespace-nowrap text-xs px-2.5 py-1.5 flex items-center gap-1 font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-800/50 hover:border-rose-600 rounded-lg transition cursor-pointer shadow-sm"
            title="Cerrar sesión de repositor"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Toast Flotante de Éxito Inmediato */}
      {successToast && (
        <div className="fixed top-14 left-4 right-4 z-40 max-w-md mx-auto">
          <div className="bg-emerald-950 border border-emerald-500/80 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-emerald-200 animate-slideDown">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
            <div className="text-xs font-bold leading-tight">{successToast}</div>
          </div>
        </div>
      )}

      {/* Contenido scrolleable */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-600/70 p-3 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Tarjeta de Sesión del Repositor Autenticado */}
          <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                {currentRepositor.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{currentRepositor.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">● PIN Verificado</span>
                </p>
                <p className="text-[11px] text-slate-400">{activeBranch?.name || 'Casa Central'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Cambiar repositor o cerrar sesión"
            >
              <LogOut className="w-3 h-3" />
              <span>Cambiar</span>
            </button>
          </div>

          {/* Nombre del Producto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-sky-400" />
              <span>Nombre del Producto *</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Alfajor Havanna 90g"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-base font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Precio Actual y Precio Anterior en 2 Columnas */}
          <div className="grid grid-cols-2 gap-3">
            {/* Precio Actual */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Precio Actual *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-lg font-black text-emerald-400 select-none">
                  $
                </span>
                <input
                  type="text"
                  inputMode="text"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="1500 o 6x2000"
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xl font-black text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 shadow-inner"
                />
              </div>
            </div>

            {/* Precio Anterior (Opcional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span className="line-through text-red-400">$</span>
                <span>Anterior (Opt.)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-lg font-bold text-slate-500 select-none">
                  $
                </span>
                <input
                  type="text"
                  inputMode="text"
                  value={previousPrice}
                  onChange={(e) => setPreviousPrice(e.target.value)}
                  placeholder="1800"
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-lg font-bold text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-500 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Cantidad por Caja (Opcional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>Cantidad por Caja (Opcional)</span>
            </label>
            <input
              type="text"
              value={boxQuantity}
              onChange={(e) => setBoxQuantity(e.target.value)}
              placeholder="Ej: x 24 u. / Display 12 u."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 shadow-inner"
            />
          </div>

          {/* Botón Grande Enviar a PC */}
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !currentPrice.trim()}
            className="w-full mt-3 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] shadow-lg shadow-emerald-600/30"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transmitiendo a PC...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Enviar a PC</span>
              </>
            )}
          </button>
        </form>

        {/* Historial rápido de artículos enviados en esta sesión */}
        {recentItems.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
              <span>Enviados Recientemente</span>
            </h4>
            <div className="flex flex-col gap-1.5">
              {recentItems.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-200 truncate pr-2">{item.name}</span>
                  <span className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                    ${item.price.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Informativo */}
        <div className="mt-auto pt-6 text-center text-[11px] text-slate-500 leading-relaxed">
          Los flejes ingresados aquí aparecen en la pantalla de la PC automáticamente por Supabase Realtime para la impresión A4.
        </div>
      </main>
    </div>
  );
};

export default MobileEntry;
