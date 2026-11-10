import React, { useState, useRef } from 'react';
import { Send, CheckCircle2, ArrowLeft, ShoppingCart, DollarSign, Package, Tag, AlertTriangle, User } from 'lucide-react';
import { insertMobileEntry } from '../../../services/supabase/printQueueRealtime.service';
import { useTenantStore } from '../../../stores/useTenantStore';
import { parseQuantityDeal } from '../../../utils/priceParser';

interface MobileEntryProps {
  onBackToDesktop?: () => void;
}

export const MobileEntry: React.FC<MobileEntryProps> = ({ onBackToDesktop }) => {
  const { tradeName, brandColor, branches, activeBranchId } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const nameInputRef = useRef<HTMLInputElement | null>(null);

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

  const [name, setName] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [previousPrice, setPreviousPrice] = useState('');
  const [boxQuantity, setBoxQuantity] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);

  // Historial local de la sesión móvil
  const [recentItems, setRecentItems] = useState<Array<{ name: string; price: number }>>([]);

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
      await insertMobileEntry({
        name: trimmedName,
        current_price: parsedCurrentPrice,
        previous_price: parsedPreviousPrice && !isNaN(parsedPreviousPrice) ? parsedPreviousPrice : null,
        box_quantity: boxQuantity.trim() || null,
        price_raw: deal ? currentPrice.trim() : null,
        repositor: repositor.trim() || null,
        branch_id: activeBranch?.id,
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
      const msg = err instanceof Error ? err.message : 'Error al enviar artículo';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Barra Superior Móvil */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {onBackToDesktop && (
            <button
              onClick={onBackToDesktop}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Volver a la PC"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div
            className="w-3 h-3 rounded-full shadow"
            style={{ backgroundColor: brandColor }}
          />
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-100">
              {tradeName}
            </h1>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span>Modo Repositor</span>
              <span>•</span>
              <span className="text-slate-400 truncate max-w-[140px]">{activeBranch?.name}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-sky-400 flex items-center gap-1.5 shadow-sm">
          <span>Enviados:</span>
          <span className="bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded-full font-black text-[11px]">
            {sentCount}
          </span>
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
                  inputMode="decimal"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="1500"
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
                  inputMode="decimal"
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
