import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Sparkles, Send, Camera } from 'lucide-react';

interface PasilloConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLocalPasillo: () => void;
  onOpenLocalRepositor?: () => void;
}

export const PasilloConnectModal: React.FC<PasilloConnectModalProps> = ({
  isOpen,
  onClose,
  onOpenLocalPasillo,
  onOpenLocalRepositor,
}) => {
  const [copiedRepositor, setCopiedRepositor] = useState(false);
  const [copiedPasillo, setCopiedPasillo] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';

  const repositorUrl = `${baseUrl}?repositor=true`;
  const pasilloUrl = `${baseUrl}?pasillo=true`;

  const handleCopy = (text: string, type: 'repositor' | 'pasillo') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'repositor') {
        setCopiedRepositor(true);
        setTimeout(() => setCopiedRepositor(false), 2500);
      } else {
        setCopiedPasillo(true);
        setTimeout(() => setCopiedPasillo(false), 2500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">
                Conectar Smartphone • En Tiempo Real
              </h3>
              <p className="text-[11px] text-slate-400">Sincronización instantánea vía Supabase WebSockets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              Los artículos cargados desde el celular ingresan inmediatamente a la tanda de impresión de esta PC sin recargar la página.
            </div>
          </div>

          {/* Opción 1: Modo Repositor (Texto Puro) */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-600/40 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Send className="w-4 h-4" />
                <span>1. Modo Repositor (Carga Ágil de Texto)</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-800">
                Recomendado
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              El repositor escribe Nombre, Precio y Caja desde el pasillo y presiona "Enviar a PC".
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={repositorUrl}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 select-all focus:outline-none"
              />
              <button
                onClick={() => handleCopy(repositorUrl, 'repositor')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedRepositor ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRepositor ? 'Copiado' : 'Copiar'}</span>
              </button>
              {onOpenLocalRepositor && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLocalRepositor();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                  title="Abrir en esta pantalla"
                >
                  Probar
                </button>
              )}
            </div>
          </div>

          {/* Opción 2: Modo Pasillo (Con Cámara) */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                <Camera className="w-4 h-4" />
                <span>2. Modo Pasillo (Con Foto de Góndola)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Toma una fotografía del fleje y envía el código de barras y precio con foto adjunta.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={pasilloUrl}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-sky-300 select-all focus:outline-none"
              />
              <button
                onClick={() => handleCopy(pasilloUrl, 'pasillo')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedPasillo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPasillo ? 'Copiado' : 'Copiar'}</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenLocalPasillo();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                title="Abrir en esta pantalla"
              >
                Probar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
