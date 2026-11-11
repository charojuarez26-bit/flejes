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
  const { tradeName, branches, activeBranchId } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

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
      {/* 1. Regla CSS estricta para forzar orientación horizontal A4 landscape y resetear márgenes */}
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
            <span className="text-white font-extrabold">Modo Cartel A4 Apaisado (Horizontal): </span>
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

      {/* 2. Contenedor Principal Expandido: Ocupa toda la hoja en pantalla (297mm x 210mm) y al imprimirse (w-full min-h-screen) */}
      <div
        className="w-[297mm] h-[210mm] max-w-full bg-white text-slate-950 p-6 md:p-8 flex flex-col justify-between items-center box-border border-8 border-slate-950 shadow-2xl relative select-none print:w-full print:min-h-screen print:h-screen print:max-h-screen print:m-0 print:border-none print:shadow-none print:p-8 print:justify-between"
      >
        {/* Encabezado Superior: Comercio + Banner de Impacto "SUPER OFERTA" */}
        <header className="w-full flex items-center justify-between border-b-4 border-slate-950 pb-3">
          <div className="text-left max-w-[28%]">
            <div className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-950 leading-none truncate">
              {tradeName}
            </div>
            <div className="text-xs uppercase tracking-widest font-bold text-slate-600 mt-1 truncate">
              {activeBranch?.name || 'Sucursal Principal'}
            </div>
          </div>

          {/* Banner llamativo "SUPER OFERTA" estilo cartel retail */}
          <div className="bg-red-600 text-white font-black text-3xl md:text-5xl px-10 py-2.5 rounded-2xl uppercase tracking-widest border-4 border-red-800 shadow-xl transform -rotate-1 select-none">
            SUPER OFERTA
          </div>

          <div className="text-right max-w-[28%]">
            <div className="text-xs md:text-sm font-bold text-slate-900 uppercase">
              Válido al {todayStr}
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold">
              Hasta agotar stock
            </div>
          </div>
        </header>

        {/* 3. Centro Dominante: Flexbox centrado con Tipografía Gigante */}
        <main className="flex-1 w-full flex flex-col justify-center items-center my-auto text-center gap-3 py-2 overflow-hidden">
          {/* Nombre del Producto: text-6xl / text-7xl font-black */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-center uppercase leading-[1.04] tracking-tight text-slate-950 text-balance w-full px-4">
            {item.product_name}
          </h1>

          {/* Presentación (si aplica) */}
          {item.box_quantity && (
            <div className="text-lg md:text-xl font-black uppercase tracking-wider text-slate-800 bg-slate-100 border-2 border-slate-300 px-5 py-0.5 rounded-full">
              Presentación: {item.box_quantity}
            </div>
          )}

          {/* Oferta Tachada (Precio Anterior) */}
          {templateType === 'oferta_tachada' && item.previous_price && (
            <div className="bg-red-100 border-4 border-red-300 text-red-700 px-8 py-1 rounded-full flex items-center gap-4 text-2xl md:text-3xl font-black">
              <span className="uppercase tracking-wider">Antes:</span>
              <span className="line-through">
                ${formattedPrice(item.previous_price)}
              </span>
            </div>
          )}

          {/* Precio Dominante Bestial: text-[12rem] / text-[15rem] */}
          {quantityDeal ? (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-6xl md:text-8xl font-black text-slate-800 mr-4">
                  {quantityDeal.quantity} x
                </span>
                <span className="text-7xl md:text-9xl font-black text-slate-900 leading-none mr-2">
                  $
                </span>
                <span className="text-[8rem] md:text-[11rem] lg:text-[13rem] font-black text-slate-950 leading-none tracking-tighter">
                  {formattedPrice(quantityDeal.totalPrice)}
                </span>
              </div>

              {/* Placa de Precio Unitario */}
              <div className="mt-2 px-9 py-2 bg-amber-400 text-slate-950 rounded-2xl border-4 border-slate-950 shadow-xl">
                <span className="text-2xl md:text-3xl font-black uppercase tracking-wide">
                  PRECIO UNITARIO: ${quantityDeal.unitPriceFormatted}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {templateType === 'dos_por_uno' && (
                <div className="mb-2 px-8 py-1.5 bg-amber-400 text-slate-950 font-black text-2xl md:text-3xl rounded-xl border-4 border-slate-950 uppercase">
                  Llevando 2 u. c/u: ${formattedPrice(item.current_price / 2)}
                </div>
              )}

              {templateType === 'segunda_50' && (
                <div className="mb-2 px-8 py-1.5 bg-sky-500 text-white font-black text-2xl md:text-3xl rounded-xl border-4 border-slate-950 uppercase">
                  La 2da unidad a: ${formattedPrice(item.current_price * 0.5)}
                </div>
              )}

              {/* Precio Normal Gigante */}
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-7xl md:text-9xl lg:text-[10rem] font-black text-slate-900 leading-none mr-3">
                  $
                </span>
                <span className="text-[9.5rem] md:text-[12rem] lg:text-[14.5rem] font-black text-slate-950 leading-none tracking-tighter">
                  {formattedPrice(item.current_price)}
                </span>
              </div>
            </div>
          )}
        </main>

        {/* 4. Pie de Página con Código de Barras Ampliado (w-3/4 max-w-4xl) */}
        <footer className="w-full border-t-4 border-slate-950 pt-2.5 flex items-end justify-between">
          {/* Código de barras ampliado */}
          <div className="w-3/4 max-w-xl">
            <BarcodeRenderer
              value={item.barcode}
              height={40}
              width={2.2}
              fontSize={13}
            />
          </div>

          <div className="text-right flex flex-col justify-end">
            <div className="text-xs md:text-sm font-bold text-slate-800 uppercase">
              Precios válidos para {activeBranch?.name || tradeName}
            </div>
            <div className="text-[10px] md:text-[11px] text-slate-500">
              Impreso mediante FlejesPro • PM Soluciones Digitales
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
