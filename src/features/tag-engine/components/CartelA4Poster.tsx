import React from 'react';
import { PrintQueueItem, MarketingTemplate } from '../../../types/database.types';
import { useTenantStore } from '../../../stores/useTenantStore';
import { BarcodeRenderer } from './BarcodeRenderer';
import { parseQuantityDeal } from '../../../utils/priceParser';
import { Sparkles, ArrowLeft, Printer } from 'lucide-react';

interface CartelA4PosterProps {
  item: PrintQueueItem;
  onClose?: () => void;
}

export const CartelA4Poster: React.FC<CartelA4PosterProps> = ({ item, onClose }) => {
  const { tradeName, organization, branches, activeBranchId } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const nombreComercio = tradeName || organization?.header_title || organization?.name || 'TODO GOLOSINAS';

  const formattedPrice = (price: number) => {
    return price.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const todayStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Detección de oferta por cantidad (ej: "6x2000")
  const quantityDeal =
    parseQuantityDeal(item.price_raw || item.promo_detail || '') ||
    parseQuantityDeal(item.current_price?.toString() || '');

  // Plantilla de marketing
  const templateType: MarketingTemplate =
    item.template_type ||
    (item.promo_type === 'strikethrough'
      ? 'oferta_tachada'
      : item.promo_type === 'two_for_one'
      ? 'dos_por_uno'
      : item.promo_type === 'second_50'
      ? 'segunda_50'
      : 'normal');

  return (
    <div className="flex flex-col items-center w-full">
      {/* 1. Regla CSS para forzar A4 horizontal sin márgenes */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .printable-area {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Barra de Controles superior (solo pantalla) */}
      <div className="w-[297mm] max-w-full flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 text-xs font-bold text-slate-200 shadow-xl print:hidden">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <span className="text-white font-extrabold">Modo Cartel A4 Apaisado: </span>
            <span className="text-slate-300 font-semibold">{item.product_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cartel</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Flejes</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Contenedor Principal: Flexbox en columna sin rotaciones, todo derecho */}
      <div
        className="w-[297mm] h-[210mm] max-w-full flex flex-col w-full h-screen bg-white text-black p-8 box-border select-none shadow-2xl print:w-full print:h-screen print:p-8 print:shadow-none print:border-none overflow-hidden"
      >
        {/* Título Institucional del Negocio (Marca Blanca) Arriba del Todo */}
        <div className="w-full text-center border-b-8 border-black pb-4 mb-auto mt-2 flex-shrink-0">
          <h1 className="text-5xl font-black uppercase tracking-widest text-black">
            {nombreComercio}
          </h1>
          {activeBranch?.name && (
            <div className="text-xs uppercase tracking-widest font-bold text-gray-700 mt-1">
              {activeBranch.name} • Precios vigentes al {todayStr}
            </div>
          )}
        </div>

        {/* 3. Contenedor que centra el resto del contenido en el espacio restante */}
        <div className="flex-1 flex flex-col justify-center items-center gap-3 my-auto w-full text-center overflow-hidden">
          {/* Insignia SUPER OFERTA (completamente derecha, sin rotar) */}
          <div className="bg-red-600 text-white font-black text-3xl md:text-4xl px-10 py-1.5 rounded-2xl uppercase tracking-widest border-4 border-red-800 shadow-md flex-shrink-0">
            SUPER OFERTA
          </div>

          {/* Nombre del Producto */}
          <h2 className="text-5xl md:text-6xl font-black text-center uppercase tracking-tight text-black text-balance max-w-[96%] leading-tight">
            {item.product_name}
          </h2>

          {/* Presentación (si aplica) */}
          {item.box_quantity && (
            <div className="text-base md:text-lg font-black uppercase tracking-wider text-gray-800 bg-gray-100 border-2 border-gray-300 px-5 py-0.5 rounded-full flex-shrink-0">
              Presentación: {item.box_quantity}
            </div>
          )}

          {/* Oferta Tachada (si aplica) */}
          {templateType === 'oferta_tachada' && item.previous_price && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 px-8 py-0.5 rounded-full flex items-center gap-4 text-2xl md:text-3xl font-black flex-shrink-0">
              <span className="uppercase tracking-wider">Antes:</span>
              <span className="line-through">
                ${formattedPrice(item.previous_price)}
              </span>
            </div>
          )}

          {/* Precio Dominante Bestial */}
          {quantityDeal ? (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-6xl md:text-7xl font-black text-gray-800 mr-3">
                  {quantityDeal.quantity} x
                </span>
                <span className="text-6xl md:text-8xl font-black text-black leading-none mr-2">
                  $
                </span>
                <span className="text-[7.5rem] md:text-[9.5rem] lg:text-[11rem] font-black text-black leading-none tracking-tighter">
                  {formattedPrice(quantityDeal.totalPrice)}
                </span>
              </div>

              {/* Placa de Precio Unitario */}
              <div className="mt-1.5 px-8 py-1.5 bg-amber-400 text-black rounded-xl border-4 border-black shadow-md">
                <span className="text-2xl font-black uppercase tracking-wide">
                  PRECIO UNITARIO: ${quantityDeal.unitPriceFormatted}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {templateType === 'dos_por_uno' && (
                <div className="mb-1.5 px-6 py-1 bg-amber-400 text-black font-black text-2xl rounded-xl border-2 border-black uppercase">
                  Llevando 2 u. c/u: ${formattedPrice(item.current_price / 2)}
                </div>
              )}

              {templateType === 'segunda_50' && (
                <div className="mb-1.5 px-6 py-1 bg-sky-500 text-white font-black text-2xl rounded-xl border-2 border-black uppercase">
                  La 2da unidad a: ${formattedPrice(item.current_price * 0.5)}
                </div>
              )}

              {/* Precio Normal Masivo */}
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-6xl md:text-8xl lg:text-[9rem] font-black text-black leading-none mr-2">
                  $
                </span>
                <span className="text-[8.5rem] md:text-[11rem] lg:text-[13rem] font-black text-black leading-none tracking-tighter">
                  {formattedPrice(item.current_price)}
                </span>
              </div>
            </div>
          )}

          {/* Código de Barras */}
          <div className="w-full max-w-md mx-auto mt-2">
            <BarcodeRenderer
              value={item.barcode}
              height={36}
              width={2.2}
              fontSize={12}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
