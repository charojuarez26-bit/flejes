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
      {/* Estilos condicionales para impresión obligatoria en A4 Landscape (Horizontal) */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
          html, body, .printable-area {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
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

      {/* Cartel A4 Físico en formato Horizontal / Landscape (297mm x 210mm) */}
      <div
        className="bg-white text-slate-950 p-[7mm] shadow-2xl flex flex-col justify-between box-border border-8 border-slate-950 relative select-none print:shadow-none print:m-0 print:border-8 print:border-slate-950 print:break-after-avoid overflow-hidden"
        style={{
          width: '297mm',
          height: '210mm',
          maxHeight: '210mm',
        }}
      >
        {/* 1. Encabezado de Supermercado con Insignia SUPER OFERTA */}
        <div className="w-full flex items-center justify-between border-b-4 border-slate-950 pb-2.5">
          <div className="text-left max-w-[28%]">
            <div className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-950 leading-none truncate">
              {tradeName}
            </div>
            <div className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-slate-600 mt-0.5 truncate">
              {activeBranch?.name || 'Sucursal Principal'}
            </div>
          </div>

          {/* Insignia central llamativa de SUPER OFERTA */}
          <div className="bg-red-600 text-white font-black text-2xl md:text-4xl px-8 py-2 md:py-2.5 rounded-2xl uppercase tracking-widest border-4 border-red-800 shadow-xl transform -rotate-1 select-none">
            SUPER OFERTA
          </div>

          <div className="text-right max-w-[28%]">
            <div className="text-[11px] md:text-xs font-bold text-slate-800 uppercase">
              Válido al {todayStr}
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">
              Hasta agotar stock
            </div>
          </div>
        </div>

        {/* 2. Cuerpo Central: Layout Flexbox con Jerarquía Extrema */}
        <div className="flex-1 flex flex-col justify-center items-center h-full w-full gap-3 my-auto px-4 text-center overflow-hidden">
          {/* Nombre del Producto Gigante */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-center leading-[1.08] text-balance text-slate-950 tracking-tight max-w-[95%]">
            {item.product_name}
          </h1>

          {/* Presentación (si aplica) */}
          {item.box_quantity && (
            <div className="text-sm md:text-base font-black uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-300 px-4 py-0.5 rounded-full">
              Presentación: {item.box_quantity}
            </div>
          )}

          {/* Oferta Tachada (Precio Anterior) */}
          {templateType === 'oferta_tachada' && item.previous_price && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 px-6 py-1 rounded-full flex items-center gap-3">
              <span className="text-lg font-black uppercase tracking-wider">Antes:</span>
              <span className="text-2xl md:text-3xl font-black line-through">
                ${formattedPrice(item.previous_price)}
              </span>
            </div>
          )}

          {/* Precio Dominante Extremo */}
          {quantityDeal ? (
            <div className="flex flex-col items-center">
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-5xl md:text-7xl font-black text-slate-800 mr-3">
                  {quantityDeal.quantity} x
                </span>
                <span className="text-6xl md:text-8xl font-black text-slate-900 leading-none mr-2">
                  $
                </span>
                <span className="text-7xl md:text-9xl lg:text-[10.5rem] font-black text-slate-950 leading-none tracking-tighter">
                  {formattedPrice(quantityDeal.totalPrice)}
                </span>
              </div>

              {/* Precio Unitario Promocional */}
              <div className="mt-2 px-7 py-1.5 bg-amber-400 text-slate-950 rounded-2xl border-4 border-slate-950 shadow-md">
                <span className="text-xl md:text-2xl font-black uppercase tracking-wide">
                  Precio Unitario: ${quantityDeal.unitPriceFormatted}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {templateType === 'dos_por_uno' && (
                <div className="mb-2 px-5 py-1 bg-amber-400 text-slate-950 font-black text-lg md:text-xl rounded-xl border-2 border-slate-950 uppercase">
                  Llevando 2 u. c/u: ${formattedPrice(item.current_price / 2)}
                </div>
              )}

              {templateType === 'segunda_50' && (
                <div className="mb-2 px-5 py-1 bg-sky-500 text-white font-black text-lg md:text-xl rounded-xl border-2 border-slate-950 uppercase">
                  La 2da unidad a: ${formattedPrice(item.current_price * 0.5)}
                </div>
              )}

              {/* Precio Normal Gigante */}
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-6xl md:text-8xl lg:text-[7rem] font-black text-slate-900 leading-none mr-2">
                  $
                </span>
                <span className="text-8xl md:text-[10rem] lg:text-[12.5rem] font-black text-slate-950 leading-none tracking-tighter">
                  {formattedPrice(item.current_price)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Pie de Página con Código de Barras y Leyenda Legal */}
        <div className="w-full border-t-4 border-slate-950 pt-2 flex items-end justify-between">
          <div className="w-48">
            <BarcodeRenderer value={item.barcode} height={26} fontSize={10} />
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-700 uppercase">
              Precios vigentes para {activeBranch?.name || tradeName}
            </div>
            <div className="text-[9px] text-slate-500">
              Impreso mediante FlejesPro • PM Soluciones Digitales
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
