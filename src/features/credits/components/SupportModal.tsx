import React from 'react';
import { X, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100">PM Soluciones Digitales</h3>
              <p className="text-xs text-slate-400">Software para Góndolas, Precios y Retail</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-5">
            Plataforma SaaS para la generación, gestión e impresión de flejes de precios para góndolas de supermercados, farmacias y minimarkets.
          </p>

          <div className="space-y-2.5">
            <a
              href="https://wa.me/?text=Hola%20PM%20Soluciones%20Digitales,%20necesito%20soporte%20sobre%20el%20generador%20de%20flejes"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contactar Soporte por WhatsApp</span>
            </a>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex justify-between items-center">
              <span>Versión 2.0 (10 flejes/hoja A4)</span>
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <span>Góndola Pro</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
