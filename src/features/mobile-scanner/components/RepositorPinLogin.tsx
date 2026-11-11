import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useTenantStore } from '../../../stores/useTenantStore';
import { Lock, Delete, Loader2, AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';

interface RepositorPinLoginProps {
  onSuccess: () => void;
  onBackToDesktop?: () => void;
}

export const RepositorPinLogin: React.FC<RepositorPinLoginProps> = ({ onSuccess, onBackToDesktop }) => {
  const [pin, setPin] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    setCurrentRepositor,
    setCurrentBranch,
    setCurrentOrganization,
    setBranding,
  } = useTenantStore();

  const triggerErrorFeedback = useCallback((message: string) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPin('');
    setErrorMessage(message);
  }, []);

  // Validación del PIN contra Supabase
  const validatePin = useCallback(async (currentPin: string) => {
    setIsValidating(true);
    setErrorMessage(null);

    try {
      // 1. Intentar consulta con 'pin_code'
      let res = await supabase
        .from('repositores')
        .select(`
          id,
          name,
          is_active,
          branch_id,
          branches (
            id,
            name,
            organization_id,
            organizations (
              id,
              name,
              white_label_name,
              subscription_status,
              next_billing_date
            )
          )
        `)
        .eq('pin_code', currentPin)
        .single();

      // Fallback si la columna en la BD se llama 'pin'
      if (res.error && (res.error.message?.includes('pin_code') || res.error.code === '42703')) {
        res = await supabase
          .from('repositores')
          .select(`
            id,
            name,
            is_active,
            branch_id,
            branches (
              id,
              name,
              organization_id,
              organizations (
                id,
                name,
                white_label_name,
                subscription_status,
                next_billing_date
              )
            )
          `)
          .eq('pin', currentPin)
          .single();
      }

      const { data, error } = res;

      if (error || !data) {
        console.error("Error al validar PIN de repositor:", error?.message, error?.details, error?.hint);
        triggerErrorFeedback('PIN no reconocido');
        return;
      }

      // Validar si el repositor está activo
      if (data.is_active === false) {
        triggerErrorFeedback('PIN no reconocido');
        return;
      }

      // Extraer datos anidados de branches y organizations
      const branchData: any = Array.isArray(data.branches) ? data.branches[0] : data.branches;
      let orgData: any = branchData
        ? (Array.isArray(branchData.organizations) ? branchData.organizations[0] : branchData.organizations)
        : null;

      // Si no vino anidado, consultar la organización directamente
      if (!orgData && branchData?.organization_id) {
        const { data: directOrg } = await supabase
          .from('organizations')
          .select('id, name, white_label_name, subscription_status, next_billing_date')
          .eq('id', branchData.organization_id)
          .maybeSingle();
        if (directOrg) {
          orgData = directOrg;
        }
      }

      // Validación estricta de Paywall: Solo activo y con fecha de facturación no vencida
      const isOrgActive = orgData?.subscription_status === 'active';
      const isBillingCurrent = (() => {
        if (!orgData?.next_billing_date) return true;
        const cleanDate = String(orgData.next_billing_date).split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length !== 3) return true;
        const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        return dueDate.getTime() >= Date.now();
      })();

      if (!isOrgActive || !isBillingCurrent) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('current_repositor');
          localStorage.removeItem('repositor_nombre');
          localStorage.removeItem('repositorName');
        }
        triggerErrorFeedback('Comercio suspendido por falta de pago');
        return;
      }

      // Datos validados con éxito: Guardar en Zustand y localStorage
      const repositorInfo = {
        id: String(data.id),
        name: String(data.name || 'Repositor'),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('repositorName', repositorInfo.name);
      }

      setCurrentRepositor(repositorInfo);

      if (data.branch_id) {
        setCurrentBranch(String(data.branch_id));
      }

      if (branchData?.organization_id) {
        setCurrentOrganization(String(branchData.organization_id));
      }

      const displayName = orgData?.white_label_name || orgData?.name || branchData?.name;
      if (displayName) {
        setBranding(displayName, '#0f172a', '#f59e0b');
      }

      // Feedback háptico de éxito
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 40, 50]);
      }

      onSuccess();
    } catch (err: unknown) {
      console.error("Error inesperado en validatePin:", err);
      triggerErrorFeedback('Error al comprobar PIN. Intenta nuevamente.');
    } finally {
      setIsValidating(false);
    }
  }, [setCurrentRepositor, setCurrentBranch, setCurrentOrganization, setBranding, onSuccess, triggerErrorFeedback]);

  // Manejar pulsaciones del teclado en pantalla
  const handleDigitPress = (digit: string) => {
    if (isValidating || pin.length >= 4) return;
    setErrorMessage(null);
    const newPin = pin + digit;
    setPin(newPin);

    // Feedback háptico suave al tipear
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }

    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handleBackspace = () => {
    if (isValidating || pin.length === 0) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isValidating) return;
    setErrorMessage(null);
    setPin('');
  };

  // Soporte para teclado físico si el usuario conecta uno
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 select-none font-sans max-w-md mx-auto relative antialiased">
      {/* Barra superior con botón volver */}
      <div className="flex items-center justify-between pt-2">
        {onBackToDesktop ? (
          <button
            onClick={onBackToDesktop}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a PC</span>
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-500/20 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          <span>Acceso Seguro</span>
        </div>
      </div>

      {/* Encabezado y círculos de dígitos */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-black/40 ring-1 ring-white/5">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          Acceso Repositor
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Ingresa tu PIN de 4 dígitos para ingresar a góndola
        </p>

        {/* Casillas / Círculos de Dígitos */}
        <div className={`flex items-center justify-center gap-4 my-8 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const hasDigit = pin.length > index;
            return (
              <div
                key={index}
                className={`w-12 h-14 rounded-xl border flex items-center justify-center text-2xl font-bold font-mono transition-all duration-150 ${
                  isShaking
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                    : hasDigit
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 shadow-lg shadow-indigo-950/60 scale-105'
                    : 'border-slate-800 bg-slate-950/60 text-slate-600'
                }`}
              >
                {hasDigit ? '•' : ''}
              </div>
            );
          })}
        </div>

        {/* Indicador de validación o Mensaje de Error */}
        <div className="min-h-12 flex items-center justify-center">
          {isValidating ? (
            <div className="flex items-center gap-2 text-xs text-indigo-400 animate-in fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Verificando PIN de seguridad...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-3 px-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs text-left flex items-start gap-2.5 animate-in fade-in max-w-xs sm:max-w-sm shadow-lg leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">
              Solicita tu PIN a la administración
            </span>
          )}
        </div>
      </div>

      {/* Teclado Numérico Táctil */}
      <div className="w-full max-w-xs mx-auto pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              disabled={isValidating}
              className="h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 active:bg-indigo-600 active:scale-95 border border-slate-700/70 text-white font-semibold text-2xl flex items-center justify-center shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          {/* Botón Limpiar */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isValidating || pin.length === 0}
            className="h-16 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 active:scale-95 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
          >
            Limpiar
          </button>

          {/* Dígito 0 */}
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            disabled={isValidating}
            className="h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 active:bg-indigo-600 active:scale-95 border border-slate-700/70 text-white font-semibold text-2xl flex items-center justify-center shadow-md transition-all cursor-pointer disabled:opacity-40"
          >
            0
          </button>

          {/* Botón Borrar / Retroceso */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isValidating || pin.length === 0}
            className="h-16 rounded-2xl bg-slate-800/60 hover:bg-slate-800 active:scale-95 border border-slate-700/50 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
            title="Borrar dígito"
          >
            <Delete className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepositorPinLogin;
